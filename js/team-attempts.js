class TeamAttemptsViz {
  constructor() {
    this.width = 900;
    this.height = 600;
    this.margin = { top: 80, right: 50, bottom: 50, left: 80 };

    // Create SVG container with updated ID
    this.svg = d3
      .select("#team-attempts-chart")
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("background-color", "#f0f0f0");

    // Tooltip with updated class
    this.tooltip = d3.select(".team-attempts-tooltip");

    // Define scales
    this.xScale = d3
      .scaleLinear()
      .range([this.margin.left, this.width - this.margin.right]);
    this.yScale = d3
      .scaleLinear()
      .range([this.height - this.margin.bottom, this.margin.top]);
    this.colorScale = d3.scaleLinear().range(["green", "yellow", "purple"]);
    this.sizeScale = d3.scaleLinear().range([25, 70]);

    this.initViz();
  }

  initViz() {
    console.log("Starting to load data...");

    d3.csv("/data/nba_3pt_data.csv")
      .then((data) => {
        console.log("Data loaded successfully:", data);
        // Parse numeric values
        data.forEach((d) => {
          d.attempts = +d["3PA"];
          d.percentage = +d["3P%"];
          d.makes = +d["3PM"];
          d.shortName = d.Team.split(" ").slice(-1)[0];
        });

        // Set domains for scales
        this.xScale.domain([25, 48]);
        this.yScale.domain([32, 39]);
        this.colorScale.domain([30, 35, 40]);
        this.sizeScale.domain([
          d3.min(data, (d) => d.attempts),
          d3.max(data, (d) => d.attempts),
        ]);

        // Add circles
        this.svg
          .selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr("cx", (d) => this.xScale(d.attempts))
          .attr("cy", (d) => this.yScale(d.percentage))
          .attr("r", (d) => this.sizeScale(d.attempts))
          .attr("fill", (d) => this.colorScale(d.percentage))
          .attr("stroke", "black")
          .attr("opacity", 0.8)
          .on("mouseover", (event, d) => {
            const tooltipWidth = 200; // Approximate width of tooltip
            const tooltipHeight = 100; // Approximate height of tooltip

            // Calculate position relative to the container
            const containerRect = document
              .querySelector(".viz-container")
              .getBoundingClientRect();
            const xPosition = event.pageX - containerRect.left;
            const yPosition = event.pageY - containerRect.top;

            this.tooltip.transition().duration(200).style("opacity", 0.9);

            this.tooltip
              .html(
                `<strong>${d.Team}</strong><br>3PA: ${d.attempts}<br>3P%: ${d.percentage}<br>3PM: ${d.makes}`
              )
              .style("left", `${xPosition + 20}px`)
              .style("top", `${yPosition - 10}px`);
          })
          .on("mouseout", () => {
            this.tooltip.transition().duration(200).style("opacity", 0);
          });

        // Add shortened labels inside circles
        this.svg
          .selectAll("text.label")
          .data(data)
          .enter()
          .append("text")
          .attr("x", (d) => this.xScale(d.attempts))
          .attr("y", (d) => this.yScale(d.percentage) + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("fill", "black")
          .text((d) => d.shortName);

        // Add axes
        const xAxis = d3.axisBottom(this.xScale).ticks(10);
        const yAxis = d3.axisLeft(this.yScale).ticks(10);

        this.svg
          .append("g")
          .attr(
            "transform",
            `translate(0, ${this.height - this.margin.bottom})`
          )
          .call(xAxis)
          .append("text")
          .attr("x", this.width / 2)
          .attr("y", this.margin.bottom - 10)
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text("3-Point Attempts");

        this.svg
          .append("g")
          .attr("transform", `translate(${this.margin.left}, 0)`)
          .call(yAxis)
          .append("text")
          .attr("transform", `rotate(-90)`)
          .attr("x", -(this.height / 2))
          .attr("y", -this.margin.left + 20)
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text("3-Point Percentage (%)");
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
        console.error("Attempted path:", "/data/nba_3pt_data.csv");
      });
  }
}

// Create an instance of the visualization when the document is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("Creating visualization...");
  new TeamAttemptsViz();
});
