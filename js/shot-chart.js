const width = 500;
const height = 470;
const scale = 1;
const courtWidth = width * scale;
const courtHeight = height * scale;

const svg = d3
  .select("#shot-chart")
  .attr("width", courtWidth)
  .attr("height", courtHeight + 50);

// court image
svg
  .append("image")
  .attr("href", "img/court.jpg")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", courtWidth)
  .attr("height", courtHeight)
  .attr("transform", `rotate(180, ${courtWidth / 2}, ${courtHeight / 2})`);

// year dataset
let data = {};

Promise.all([
  d3.csv("data/NBA_2024_Shots.csv"),
  d3.csv("data/NBA_2023_Shots.csv"),
]).then(([data2024, data2023]) => {
  data2024.forEach((d) => {
    d.LOC_X = +d.LOC_X;
    d.LOC_Y = +d.LOC_Y;
    d.SHOT_MADE = d.SHOT_MADE === "TRUE";
  });

  data2023.forEach((d) => {
    d.LOC_X = +d.LOC_X;
    d.LOC_Y = +d.LOC_Y;
    d.SHOT_MADE = d.SHOT_MADE === "TRUE";
  });

  data[2024] = data2024;
  data[2023] = data2023;

  // year dropdown
  const yearDropdown = d3.select("#year-select");
  const years = Object.keys(data).sort((a, b) => +b - +a);
  years.forEach((year) => {
    yearDropdown.append("option").text(year).attr("value", year);
  });

  playerDropdown(data2024);

  yearDropdown.on("change", function () {
    const year = this.value;
    loadDataForYear(year);
  });
});

function loadDataForYear(year) {
  if (data[year]) {
    playerDropdown(data[year]);
  } else {
    d3.csv(`NBA_${year}_Shots.csv`).then((d) => {
      d.forEach((d1) => {
        d1.LOC_X = +d1.LOC_X;
        d1.LOC_Y = +d1.LOC_Y;
        d1.SHOT_MADE = d1.SHOT_MADE === "TRUE";
      });
      data[year] = d;
      playerDropdown(d);
    });
  }
}

function playerDropdown(data) {
  let playerNames = data.map((d) => d.PLAYER_NAME);
  playerNames = new Set(playerNames); // remove duplicates
  playerNames = Array.from(playerNames); // convert to array

  const playerDropdown = d3.select("#player-select");
  playerDropdown.selectAll("option").remove();
  playerNames.forEach((name) => {
    playerDropdown.append("option").text(name).attr("value", name);
  });

  updateChart(playerNames[0], data);

  playerDropdown.on("change", function () {
    updateChart(this.value, data);
  });
}

function updateChart(player, data) {
  const playerData = data.filter((d) => d.PLAYER_NAME === player);

  svg.selectAll(".shot").remove();

  svg
    .selectAll(".shot")
    .data(playerData)
    .enter()
    .append("circle")
    .attr("class", "shot")
    .attr("cx", (d) =>
      d3.scaleLinear().domain([-25, 25]).range([0, courtWidth])(d.LOC_X)
    )
    .attr("cy", (d) =>
      d3.scaleLinear().domain([0, 50]).range([courtHeight, 0])(d.LOC_Y)
    )
    .attr("r", 5)
    .style("fill", (d) => (d.SHOT_MADE ? "green" : "red"))
    .style("opacity", 0.8);
}

// Add a legend
const legend = svg
  .append("g")
  .attr("transform", `translate(${courtWidth / 2 - 90}, ${courtHeight + 10})`);

legend
  .append("circle")
  .attr("cx", 0)
  .attr("cy", 10)
  .attr("r", 5)
  .style("fill", "green");

legend
  .append("text")
  .attr("x", 10)
  .attr("y", 15)
  .text("Made Shot")
  .style("font-size", "12px")
  .attr("alignment-baseline", "middle");

legend
  .append("circle")
  .attr("cx", 100)
  .attr("cy", 10)
  .attr("r", 5)
  .style("fill", "red");

legend
  .append("text")
  .attr("x", 110)
  .attr("y", 15)
  .text("Missed Shot")
  .style("font-size", "12px")
  .attr("alignment-baseline", "middle");
