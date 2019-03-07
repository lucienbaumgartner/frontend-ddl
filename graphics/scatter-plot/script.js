// parameetr variables
var top_n = 5;
var kt = 'Wallis';
// set the dimensions and margins of the graph
var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// parse the date / time
var parseTime = d3.timeParse("%d-%b-%y");

var color = d3.scaleOrdinal(d3.schemeCategory10);

// set the ranges
var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

// define the line
var valueline = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.Twitter_Success_Score); });

// append the svg obgect to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select("body").append("svg")
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
/*
function multiFilter (arr, filters)  {
    const filterKeys = Object.keys(filters);

    return arr.filter(eachObj => {
        return filterKeys.every(eachKey => {

            if (!filters[eachKey].length) {
                return true;
            }

            if (eachObj[eachKey].id) {
                return filters[eachKey].includes(eachObj[eachKey].id );
            } else {
                return filters[eachKey].some(f => eachObj[eachKey].some(v => v.id === f));
            }
        });
    });
}
*/
// Get the data
d3.csv("Twitter_Score.csv", function(error, data) {
  if (error) throw error;
  console.log(data);
  //data = data.filter(function(d) { !d.Canton == ''; } );
  console.log(data);

  // format the data
  data.forEach(function(d) {
      d.date = firstDayOfWeek(parseInt(d.Year, 10), parseInt(d.Week, 10)); // use if you only have a week-year spec
      // d.date = parseTime(d.date); // use if you already have a date object
      d.close = +d.close;
  });

  // Scale the range of the data
  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain([0, d3.max(data, function(d) { return d.Twitter_Success_Score; })]);
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

  var sliced_data = []
  nested_data.forEach(function(d) {
    sliced_data.push({'Canton' : d.key, 'vars' : d.values.slice(0,3).filter( function(x){ return x.value > 0; })});
  });
  console.log(sliced_data);

  var ids = []
  sliced_data.forEach(function(d){ d.vars.forEach(function(x){ ids.push(parseInt(x.key, 10)); }); });
  console.log(ids);
  /*
  var dummy = [{User_id: '1', name: 'a'}, {User_id: '2', name: 'b'}, {User_id: '3', name: 'c'}]
  var ids = [1,2]
  console.log(ids);
  console.log(dummy);

  const result = dummy.filter(f => ids.includes(parseInt(f.User_id, 10)));
  console.log(result);

  console.log(data.User_id);
  */
  /*
  let filters = {
  User_id: ids,
  Canton: kt
  };
  console.log(data);
  console.log(filters);
  console.log(multiFilter(data, filters));
  console.log(data.forEach(function(d) { multiFilter(d, filters); }));
  */
  //console.log(data.filter(f => ids.includes(parseInt(f.User_id), 10)).forEach(function(x){x.filter(x.Canton==kt);}));
  // Add the valueline path.
  //data.forEach(function(x){console.log(parseInt(x.User_id, 10));});
  var subset = data.filter(f => ids.includes(parseInt(f.User_id), 10) && f.Canton == kt)
  console.log(subset);

  var elements = [];
  subset.forEach(function(d){ elements.push(d.User_id); });
  elements = [...new Set(elements)];
  console.log(elements);

  var dataNest = d3.nest()
        .key(function(d) {return d.User_id;})
        .entries(subset);

  dataNest.forEach(
    function(d){
      // console.log(subset.filter(function(x){ return x.User_id == d;}));
      var path = svg.append("path")
          .data([subset.filter(function(x){ return x.User_id == d; })])
          .attr("class", "line")
          .style("stroke", function() { // Add dynamically
                return d.color = color(d.key); })
          .attr("d", valueline(d.values));
    }
  )
  /*
  var path = document.querySelector('.path');
  var length = path.getTotalLength();
  path
    .style('stroke-dasharray', 1000)
    .style('stroke-dashoffset', 1000)
    .style('animation', 'dash 5s linear alternate forward')
    */
  /*
  svg.append("path")
      .data([data.filter(f => ids.includes(parseInt(f.User_id), 10) && f.Canton == kt)])
      .attr("class", "line")
      .attr("d", valueline);
  */

  // add dots to plot
  svg.selectAll(".dot")
      .data(data.filter(f => ids.includes(parseInt(f.User_id), 10) && f.Canton == kt))
    .enter().append("circle")
      .attr('class', 'dot')
      .attr("r", 0)
      .attr("cx", function(d) { return x(d.date); })
      .attr("cy", function(d) { return y(d.Twitter_Success_Score); })
      //.style('fill', 'steelblue')
      .style("fill", function(d) { return color(d.User_id); })
    .transition()
      .duration(5000)
      .attr("r", 3.5);

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

});
