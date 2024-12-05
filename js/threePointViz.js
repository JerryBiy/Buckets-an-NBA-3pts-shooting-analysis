class ThreePointViz {
  constructor(containerId) {
    this.margin = { top: 20, right: 20, bottom: 40, left: 60 };
    this.width = 800 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;
    this.container = d3.select(containerId);
    this.sizeMode = "fixed";
    this.currentSeason = null;

    this.setupSVG();
    this.setupScales();
    this.setupAxes();
    this.setupListeners();
  }

  setupSVG() {
    this.svg = this.container
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
  }

  setupScales() {
    this.xScale = d3.scaleLinear().range([0, this.width]);
    this.yScale = d3.scaleLinear().range([this.height, 0]);
    this.radiusScale = d3.scaleLinear().range([5, 20]);
  }

  setupAxes() {
    this.xAxis = d3.axisBottom(this.xScale);
    this.yAxis = d3.axisLeft(this.yScale);

    this.svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${this.height})`);

    this.svg.append("g").attr("class", "y-axis");

    this.svg
      .append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height + 35)
      .text("3-Point Attempts (FG3A)");

    this.svg
      .append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -this.height / 2)
      .text("3-Point Made (FG3M)");
  }

  setupListeners() {
    d3.select("#sizeSelector").on("change", () => {
      this.sizeMode = d3.select("#sizeSelector").property("value");
      this.updateViz();
    });

    d3.select("#seasonSelector").on("change", () => {
      this.currentSeason = d3.select("#seasonSelector").property("value");
      this.updateViz();
    });
  }

  updateViz() {
    if (!this.allData || !this.currentSeason) return;

    const seasonData = this.allData.filter(
      (d) => d.season === this.currentSeason
    );

    this.xScale.domain([0, d3.max(seasonData, (d) => d.attempts)]);
    this.yScale.domain([0, d3.max(seasonData, (d) => d.made)]);
    this.radiusScale.domain([0, 1]);

    this.svg.select(".x-axis").call(this.xAxis);
    this.svg.select(".y-axis").call(this.yAxis);

    const circles = this.svg
      .selectAll("circle")
      .data(seasonData, (d) => d.team);

    circles
      .enter()
      .append("circle")
      .merge(circles)
      .transition()
      .duration(750)
      .attr("cx", (d) => this.xScale(d.attempts))
      .attr("cy", (d) => this.yScale(d.made))
      .attr("r", (d) =>
        this.sizeMode === "winrate" ? this.radiusScale(d.winRate) : 8
      )
      .attr("fill", "#4fbfa8")
      .attr("opacity", 0.7);

    circles.exit().remove();

    this.svg
      .selectAll("circle")
      .on("mouseover", (event, d) => {
        d3.select("#tooltip")
          .style("display", "block")
          .html(
            `
            <strong>${d.team}</strong><br/>
            Season: ${d.season}<br/>
            3PT Made: ${d.made}<br/>
            3PT Attempts: ${d.attempts}<br/>
            3PT%: ${d.percentage.toFixed(1)}%<br/>
            Win Rate: ${(d.winRate * 100).toFixed(1)}%
          `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", () => {
        d3.select("#tooltip").style("display", "none");
      });
  }

  setData(data) {
    this.allData = data;

    // Populate season selector
    const seasons = [...new Set(data.map((d) => d.season))].sort();
    d3.select("#seasonSelector")
      .selectAll("option")
      .data(seasons)
      .enter()
      .append("option")
      .text((d) => d);

    this.currentSeason = seasons[seasons.length - 1]; // Select most recent season
    d3.select("#seasonSelector").property("value", this.currentSeason);

    this.updateViz();
  }

  setCurrentSeason(season) {
    this.currentSeason = season;
    d3.select("#seasonSelector").property("value", this.currentSeason);
  }
}

// Initialize visualization
document.addEventListener("DOMContentLoaded", () => {
  const viz = new ThreePointViz("#scatter-plot");

  Promise.all([d3.csv("data/team_stats_traditional_rs.csv")])
    .then(([statsData]) => {
      // Process the data
      const processedData = statsData.map((d) => ({
        team: d.TEAM_NAME,
        season: d.SEASON,
        attempts: +d.FG3A,
        made: +d.FG3M,
        percentage: +d.FG3_PCT * 100,
        winRate: +d.W_PCT,
      }));

      // Get unique seasons for the selector
      const seasons = [...new Set(processedData.map((d) => d.season))].sort();

      // Populate season selector
      const seasonSelector = d3
        .select("#seasonSelector")
        .selectAll("option")
        .data(seasons)
        .enter()
        .append("option")
        .text((d) => d)
        .attr("value", (d) => d);

      // Set initial season to most recent
      const latestSeason = seasons[seasons.length - 1];
      d3.select("#seasonSelector").property("value", latestSeason);

      viz.setData(processedData);
      viz.setCurrentSeason(latestSeason);
    })
    .catch((error) => {
      console.error("Error loading the data:", error);
    });
});
