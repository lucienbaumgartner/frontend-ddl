// set switch toggle to false
document.getElementById("switch").checked = false;

// parameter variables
var top_n = 3,
    kt = 'overall',
    colors_string = ['#DD2461', '#061A40', '#5438DC'],
    // dimensions and margins of the graph
    margin = {top: 20, right: 120, bottom: 50, left: 50},
    width = document.getElementById('wrapper').offsetWidth - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom,
    // get the date / time parser with the right format
    parseTime = d3.timeParse("%d-%b-%y"),
    // set the ranges for the axes
    x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    // define the line
    valueline = d3.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.Twitter_Success_Score); }),
    // append the svg obgect to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    svg = d3.select(".wrapper").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")"),
    // add tooltips
    div = d3.select(".wrapper").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
    //.style("z-index", "10")
    //.style("position", "absolute");

// function to convert year/week format to date var
function firstDayOfWeek (year, week) {
    // Jan 1 of 'year'
    var d = new Date(year, 0, 1),
        offset = d.getTimezoneOffset();
    // ISO: week 1 is the one with the year's first Thursday
    // so nearest Thursday: current date + 4 - current day number
    // Sunday is converted from 0 to 7
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    // 7 days * (week - overlapping first week)
    d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000
        * (week + (year == d.getFullYear() ? -1 : 0 )));
    // daylight savings fix
    d.setTime(d.getTime()
        + (d.getTimezoneOffset() - offset) * 60 * 1000);
    // back to Monday (from Thursday)
    d.setDate(d.getDate() - 3);
    return d;
}

// function to draw the data
function draw() {
  // Get the data
  d3.csv("Twitter_Score.csv", function(error, data) {
    if (error) throw error;

    // format the data
    data.forEach(function(d) {
        d.date = firstDayOfWeek(parseInt(d.Year, 10), parseInt(d.Week, 10)); // use if you only have a week-year spec
        // d.date = parseTime(d.date); // use if you already have a date object
        d.close = +d.close;
    });

    // Scale the range of the data
    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0, d3.max(data, function(d) { return d.Twitter_Success_Score; })]);

    // logical branching between overall and canton specific scores
    if (kt=='overall') {
      // limit the scope of filtering to cantonal actors
      data = data.filter(f => !f.Canton == "");
      // aggregate data (avg twitter score per user)
      var nested_data = d3.nest()
        .key(function(d) { return d.User_id; })
        .rollup(function(v) { return d3.sum(v, function(d) { return d.Twitter_Success_Score; }); })
        .entries(data);
      // sort by avgs
      nested_data.sort(function(a, b) {return d3.descending(+a.value, +b.value)});
      // take the :top_n: users
      var sliced_data = nested_data.slice(0,top_n);
      // get the IDs of the top candidates
      var ids = []
      sliced_data.forEach(function(d){ ids.push(parseInt(d.key, 10)); });
      // cycle through IDs to isolate the users
      var subset = [];
      var i;
      for (i = 0; i < ids.length; i++) {
        subset.push(data.filter(f => f.User_id == ids[i]))
      }
      // define the color domain via user ID
      var color = d3.scaleOrdinal().domain(ids).range(colors_string)
      // collapse nested arrays
      var merged = [].concat.apply([], subset);

      console.log(subset);
      // call graphics elements
      // lines
      subset.forEach(
        function(d){
          console.log(d);
          // console.log(subset.filter(function(x){ return x.User_id == d;}));
          var path = svg.append("path")
              .data(d)
              .attr("class", "line")
              .style("stroke", function(d) { // Add dynamically
                    return d.color = color(d.User_id); })
              .attr("d", valueline(d));
        }
      )
      // circles
      svg.selectAll(".dot")
          .data(merged)
        .enter().append("circle")
          .attr('class', 'dot')
          // .attr("id", function(d) {  console.log(d.User_id.toString()); })
          .attr("r", 0)
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.Twitter_Success_Score); })
          .style("fill", function(d) { return color(d.User_id); })
          .style("cursor", 'pointer')
        .on("click", function(d) {
          console.log(d.User_id);
          fillPanel(d.User_id);
        })
        .on("mouseover", function(d) {
           div.transition()
             .duration(200)
             .style("opacity", .9);
           div.html('<b>' + d.Last_Name + " " +d.First_Name + '</b>' + "<br/>" + "Kt. " + d.Canton + "<br/>" + 'Twitter Score: ' + '<b>' + d.Twitter_Success_Score.toString().substring(0, 4) + '</b>')
             .style('position', 'absolute')
             .style("background-color", color(d.User_id))
             .style("left", (d3.event.pageX + 5) + "px")
             .style("top", (d3.event.pageY - 43) + "px");
           })
       .on("mouseout", function(d) {
           div.transition()
             .duration(500)
             .style("opacity", 0);
           })
        .transition()
          .duration(document.getElementById('wrapper').offsetWidth * 2)
          .attr("r", 2.5);

      // labels
      // get max date for x-value anchor for labels
      var maxDate;
      dt = merged.map(function(d) {
          return d.date
            });
      maxDate = d3.max(d3.values(dt));
      // console.log(maxDate);
      // get latest y-values for each candidate for y-achors
      console.log(subset);
      var pg = [];
      subset.forEach(
        function(d) {
          pg.push(d.slice(d.length-1));
        }
      );
      pg = [].concat.apply([], pg);
      console.log(pg);
      pg.sort(function(a, b) {return d3.descending(+a.Twitter_Success_Score, +b.Twitter_Success_Score)});
      console.log(pg);
      // label positions
      for (var i = 0; i < pg.length; i++) {
        if(i-1>=0 && (pg[i-1] - pg[i].Twitter_Success_Score)){
          pg[i].Twitter_Success_Score = pg[i].Twitter_Success_Score + 0.5
        }
      };
      console.log(pg);
      var diffLog = [];
      for (var i = 0; i < pg.length; i++) {
        if(i>0){
          var diff = pg[(i-1)].Twitter_Success_Score - pg[i].Twitter_Success_Score
          diffLog.push(diff);
          console.log(diff);
        }
      };
      console.log(diffLog);
      for (var i = 0; i < diffLog.length; i++) {
        console.log(diffLog[i] < 0.25);
        if(diffLog[i] < 0.25){
          pg[i+1].Twitter_Success_Score = pg[i+1].Twitter_Success_Score - diffLog[i]/1.5;
        }
      }
      //append the labels
      svg.selectAll(".labels")
          .data(pg)
          .enter()
          .append("text")
          .attr('class', 'labels')
          .attr('id', function (d) { return d.User_id; })
          .attr("x", x(maxDate) + 5)
          .attr("y", function(d) { return y(d.Twitter_Success_Score) + 4; })
          .text(function (d) { return d.Last_Name + " " + d.First_Name; })
          .attr("font-size", "20px")
          .style("fill", function(d) { return color(d.User_id); })
          .style("cursor", 'pointer')
          .style("fill", function(d) { return color(d.User_id); })
          .style('pointer-events', 'visible')
          .on("click", function(d) {
            fillPanel(d.User_id);
            console.log(d.User_id);
          });

    }else{
      // aggregate on canton and user level
      var nested_data = d3.nest()
        .key(function(d) { return d.Canton; })
        .key(function(d) { return d.User_id; })
        .rollup(function(v) { return d3.sum(v, function(d) { return d.Twitter_Success_Score; }); })
        .entries(data);
      nested_data.forEach(function(d) {
        d.values.sort(function(a, b) {
          return d3.descending(+a.value, +b.value)
        });
      });
      // isolate cantons
      var cantons = []
      nested_data.forEach(function(d) { cantons.push(d.key); });
      cantons = cantons.sort().filter( function(x){ return !x ==""});
      // create dropdown menu to select canton based on canton list
      if (document.getElementsByTagName('option').length==0){
        var dropper = document.getElementById('drop-down')
        cantons.forEach(function(d) {
          var opt = document.createElement('option');
          opt.value = d;
          opt.innerHTML = d;
          dropper.appendChild(opt);
        })
      }
      // filter the :n_top: candidates
      var sliced_data = []
      nested_data.forEach(function(d) {
        sliced_data.push({'Canton' : d.key, 'vars' : d.values.slice(0,top_n).filter( function(x){ return x.value > 0; })});
      });
      console.log(sliced_data);
      // get their IDs
      var ids = []
      sliced_data.forEach(function(d){ d.vars.forEach(function(x){ ids.push(parseInt(x.key, 10)); }); });
      // create the subset based on their IDs
      var subset = data.filter(f => ids.includes(parseInt(f.User_id), 10) && f.Canton == kt)
      // get unique IDs
      var elements = [];
      subset.forEach(function(d){ elements.push(d.User_id); });
      elements = [...new Set(elements)];
      console.log(elements);
      // group data on candidate level
      var dataNest = d3.nest()
            .key(function(d) { return d.User_id; })
            .entries(subset);
      console.log(elements);
      // create color scale based on user IDs
      var color = d3.scaleOrdinal().domain(elements).range(colors_string)
      // call svg elements
      //lines
      console.log(dataNest);
      dataNest.forEach(
        function(d){
          console.log(d);
          console.log(subset.filter(function(x){ return x.User_id == d;}));
          var path = svg.append("path")
              .data([subset.filter(function(x){ return x.User_id == d; })])
              .attr("class", "line")
              .style("stroke", function() { // Add dynamically
                    return d.color = color(d.key); })
              .attr("d", valueline(d.values));
        }
      )
      // add circles to plot
      console.log(ids);
      svg.selectAll(".dot")
          .data(data.filter(f => ids.includes(parseInt(f.User_id), 10) && f.Canton == kt))
        .enter().append("circle")
          .attr('class', 'dot')
          .attr("r", 0)
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.Twitter_Success_Score); })
          .style("fill", function(d) { return color(d.User_id); })
          .style("cursor", 'pointer')
        .on("click", function(d) {
          d3.event.fillPanel(d.User_id);
          console.log(d.User_id);
        })
        .on("mouseover", function(d) {
           div.transition()
             .duration(200)
             .style("opacity", .9);
           div.html('<b>' + d.Last_Name + " " +d.First_Name + '</b>' + "<br/>" + 'Twitter Score: ' + '<b>' + d.Twitter_Success_Score.toString().substring(0, 4) + '</b>')
             .style('position', 'absolute')
             .style("background-color", color(d.User_id))
             .style("left", (d3.event.pageX + 5) + "px")
             .style("top", (d3.event.pageY - 43) + "px");
           })
       .on("mouseout", function(d) {
           div.transition()
             .duration(500)
             .style("opacity", 0);
           })
        .transition()
          .duration(document.getElementById('wrapper').offsetWidth * 2)
          .attr("r", 2.5);
          // labels
          // get max date for x-value anchor for labels
      var maxDate;
      dt = data.map(function(d) {
          return d.date
            });
      maxDate = d3.max(d3.values(dt));
      // console.log(maxDate);
      // get latest y-values for each candidate for y-achors
      var pg = [];
      dataNest.forEach(
        function(d) {
          pg.push(d.values.slice(d.values.length-1));
        }
      );
      pg = [].concat.apply([], pg);
      console.log(pg);
      pg.sort(function(a, b) {return d3.descending(+a.Twitter_Success_Score, +b.Twitter_Success_Score)});
      console.log(pg);
      // label positions
      console.log(pg.length);
      var diffLog = [];
      for (var i = 0; i < pg.length; i++) {
        if(i>0){
          var diff = pg[(i-1)].Twitter_Success_Score - pg[i].Twitter_Success_Score
          diffLog.push(diff);
          console.log(diff);
        }
      };
      console.log(diffLog);
      for (var i = 0; i < diffLog.length; i++) {
        console.log(diffLog[i] < 0.25);
        if(diffLog[i] < 0.25){
          pg[i+1].Twitter_Success_Score = pg[i+1].Twitter_Success_Score - diffLog[i]/1.5;
        }
      }
      console.log(pg);
      //append the labels
      svg.selectAll(".labels")
          .data(pg)
          .enter()
          .append("text")
          .attr('class', 'labels')
          .attr('id', function (d) { return d.User_id; })
          .attr("x", x(maxDate) + 5)
          .attr("y", function(d) { return y(d.Twitter_Success_Score) + 4; })
          .text(function (d) { return d.Last_Name + " " + d.First_Name; })
          .attr("font-size", "20px")
          .style("cursor", 'pointer')
          .on("click", function(d) {
            fillPanel(d.User_id);
            console.log(d.User_id);
          })
          .style("fill", function(d) { return color(d.User_id); })
          .style('pointer-events', 'visible');
    };
    // add the x axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x)
          .ticks(5)
          .tickFormat(d3.timeFormat("%d/%m")));

    // add the y axis
    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
    // add y axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .attr('class', 'y-axis')
        .style("text-anchor", "middle")
        //.style('border-bottom', '1px dotted black !important')
        //.style('background', 'black !important')
        //.style('color', 'lightgrey !important')
        .text("Twitter Score");
    // add axis labels for x
    svg.append("text")
        .attr("transform",
              "translate(" + (width/2) + " ," +
                             (height + margin.top + 20) + ")")
        .attr('class', 'x-axis')
        .style("text-anchor", "middle")
        .text("Date");
    fillPanel(pg[0].User_id);
  });
};

function fillPanel(candidate) {
  d3.selectAll(".twitter-timeline").remove();
  console.log(candidate);
  d3.csv("metadata.csv", function(error, data) {
    var meta = data.filter(f => f.User_id == candidate),
    //spider = meta.smartspider,
    twitterProfile = document.getElementById("meta-panel");
    console.log(meta);
    console.log(twitterProfile);
    //twitterProfile.outerHTML = meta[0].twitter_href;
    $(meta[0].twitter_href).appendTo(twitterProfile);
    /*
    var spiderFrame = document.createElement('a');
    spiderFrame.frameBorder=0;
    spiderFrame.width="300px";
    spiderFrame.height="250px";
    spiderFrame.id="spiderFrame";
    spiderFrame.setAttribute("href", link);
    spiderFrame.classList.add('frame');
    document.getElementById("meta-panel").appendChild(spiderFrame);
    */
    /*
    var twitterFrame = document.createElement('a');
    //twitterFrame.frameBorder=0;
    //twitterFrame.width="300px";
    //twitterFrame.height="250px";
    twitterFrame.id="twitterFrame";
    twitterFrame.setAttribute("href", twitterProfile);
    twitterFrame.classList.add('twitter-timeline');
    document.getElementById("meta-panel").appendChild(twitterFrame);
    */
  });
};

// canton vs. overall
// add even listener for whenever the user toggles between overall and canton view
document.getElementById("switch").addEventListener("change", function(x){
  if (document.getElementById("switch").checked){
    kt = 'Aargau';
  }else{
    kt = 'overall';
  }
  d3.selectAll("g > *").remove();
  draw();
});

// add event listener for whenever a new new canton is chosen
function changeEventHandler(event) {
  kt = event.target.value;
  console.log(kt);
  d3.selectAll("g > *").remove()
  draw();
}

// call the svg initially
var ids = draw();
console.log(ids);
//fillPanel(ids[0]);
