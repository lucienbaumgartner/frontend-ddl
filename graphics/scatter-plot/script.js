// set switch toggle to false
document.getElementById("switch").checked = false;

// parameter variables
var top_n = 3,
    kt = 'overall',
    colors_string = ['#DD2461', '#020D1F', '#5438dc'],
    // dimensions and margins of the graph
    margin = {top: 20, right: 20, bottom: 30, left: 50},
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
              "translate(" + margin.left + "," + margin.top + ")");

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
          .attr("r", 0)
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.Twitter_Success_Score); })
          .style("fill", function(d) { return color(d.User_id); })
        .transition()
          .duration(document.getElementById('wrapper').offsetWidth * 2)
          .attr("r", 2.5);
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
      var dropper = document.getElementById('drop-down')
      cantons.forEach(function(d) {
        var opt = document.createElement('option');
        opt.value = d;
        opt.innerHTML = d;
        dropper.appendChild(opt);
      })
      // filter the :n_top: candidates
      var sliced_data = []
      nested_data.forEach(function(d) {
        sliced_data.push({'Canton' : d.key, 'vars' : d.values.slice(0,top_n).filter( function(x){ return x.value > 0; })});
      });
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
            .key(function(d) {return d.User_id;})
            .entries(subset);
      console.log(elements);
      // create color scale based on user IDs
      var color = d3.scaleOrdinal().domain(elements).range(colors_string)
      // call svg elements
      //lines
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
      svg.selectAll(".dot")
          .data(data.filter(f => ids.includes(parseInt(f.User_id), 10) && f.Canton == kt))
        .enter().append("circle")
          .attr('class', 'dot')
          .attr("r", 0)
          .attr("cx", function(d) { return x(d.date); })
          .attr("cy", function(d) { return y(d.Twitter_Success_Score); })
          .style("fill", function(d) { return color(d.User_id); })
        .transition()
          .duration(document.getElementById('wrapper').offsetWidth * 2)
          .attr("r", 2.5);
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

    };
  });
};

// canton vs. overall
// add even listener for whenever the user toggles between overall and canton view
document.getElementById("switch").addEventListener("change", function(x){
  if (document.getElementById("switch").checked){
    kt = 'Aargau'
  }else{
    kt = 'overall'
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
draw();
