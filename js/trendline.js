class NBALineVis {
  constructor(parentElement, data) {
    this.parentElement = parentElement;
    this.data = data;
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Set margins
    vis.margin = {
      top: 80,
      right: 300,
      bottom: 80,
      left: 80,
    };
    vis.width = 1200 - vis.margin.left - vis.margin.right;
    vis.height = 500 - vis.margin.top - vis.margin.bottom;

    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

    vis.x = d3.scaleTime().range([0, vis.width]);

    vis.y = d3.scaleLinear().range([vis.height, 0]);

    vis.xAxis = d3.axisBottom(vis.x);
    vis.yAxis = d3.axisLeft(vis.y);

    vis.xAxisGroup = vis.svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${vis.height})`);

    vis.yAxisGroup = vis.svg.append("g").attr("class", "y-axis");

    // First, add the background container
    vis.svg
      .append("rect")
      .attr("class", "description-background")
      .attr("x", vis.width + 30)
      .attr("y", 0)
      .attr("width", 260)
      .attr("height", 300)
      .attr("fill", "white")
      .attr("rx", 8)
      .style("filter", "drop-shadow(0 2px 15px rgba(0, 0, 0, 0.05))")
      .style("stroke", "#4fbfa8")
      .style("stroke-width", "4px")
      .style("stroke-location", "outside");

    // Then add the text with updated styling
    vis.svg
      .append("text")
      .attr("class", "chart-description")
      .attr("x", vis.width + 45)
      .attr("y", 30)
      .attr("width", 230)
      .style("font-size", "0.95rem")
      .style("fill", "#495057")
      .style("line-height", "1.6")
      .style("font-family", "'Helvetica Neue', Arial, sans-serif")
      .call(
        wrap,
        230,
        "The NBA 3-Pointer Attempts Trend & Scatter Plot shows the average 3-pointer attempt per game over the years of 2010-2024. We plot an average 3-Pointers attempts trend line and also plot team performance outlier. This chart shows us higher than average 3-pointer attempt metrics from teams as well as lower than average 3-pointer attempts from teams."
      );

    vis.svg
      .append("text")
      .attr("class", "y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -vis.height / 2)
      .attr("text-anchor", "middle")
      .text("3-Point Attempts per Game");

    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
    this.workData();
  }

  workData() {
    const seasonGroups = d3.group(this.data, (d) => d.season_year);
    this.averageData = Array.from(seasonGroups)
      .map(([season, teamData]) => {
        const valid3PointAttempts = teamData
          .filter((d) => !isNaN(d.threePointersAttempted)) //Some of the data is weird this is just a check
          .map((d) => d.threePointersAttempted);

        const seasonStats = this.calculateSeasonStats(valid3PointAttempts);
        const outlierTeams = teamData.filter((team) =>
          this.isOutlier(
            team.threePointersAttempted,
            seasonStats.average,
            seasonStats.stdDev
          )
        );

        return {
          season,
          average: seasonStats.average,
          outliers: outlierTeams,
        };
      })
      .sort((a, b) => d3.ascending(a.season, b.season));

    this.updateVis();
  }

  calculateSeasonStats(attempts) {
    if (attempts.length === 0) {
      return { average: 0, stdDev: 0 };
    }

    return {
      average: d3.mean(attempts),
      stdDev: d3.deviation(attempts),
    };
  }

  isOutlier(value, average, stdDev) {
    return Math.abs(value - average) > stdDev * 3; //There's too many outliers with just 2 that's why I did 3
  }
  addInteractivity(validData) {
    // Create hover line
    const hoverLine = this.svg
      .append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", this.height)
      .style("opacity", 0);

    this.svg
      .append("rect")
      .attr("class", "overlay")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("opacity", 0)
      .on("mousemove", (event) => {
        // finding the nearest year
        const mouseX = d3.pointer(event)[0];
        const nearestData = this.findNearestData(mouseX, validData);

        // Update hover line and tooltip
        this.updateHover(nearestData, hoverLine, event);
      })
      .on("mouseout", () => {
        hoverLine.style("opacity", 0);
        this.tooltip.style("opacity", 0);
      });
  }

  findNearestData(mouseX, validData) {
    const date = this.x.invert(mouseX);
    const bisect = d3.bisector((d) => d.date).left;
    const index = bisect(validData, date, 1);

    // Choose closer point between two nearest
    const d0 = validData[index - 1];
    const d1 = validData[index];
    return date - d0.date > d1.date - date ? d1 : d0;
  }

  updateHover(data, hoverLine, event) {
    hoverLine
      .attr("x1", this.x(data.date))
      .attr("x2", this.x(data.date))
      .style("opacity", 1);

    this.tooltip
      .html(
        `
                <strong>League Average in ${data.date.getFullYear()}</strong><br/>
                ${data.average.toFixed(1)} attempts per game
            `
      )
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY - 28}px`)
      .style("opacity", 0.9);
  }

  updateVis() {
    let vis = this;

    let validData = vis.averageData.filter((d) => !isNaN(d.average));
    validData.forEach((d) => {
      let year = parseInt(d.season);
      d.date = new Date(year, 0);
    });
    vis.x.domain(d3.extent(validData, (d) => d.date));
    vis.y.domain([
      0,
      d3.max(validData, (d) =>
        Math.max(
          d.average * 1.2,
          ...d.outliers.map((o) => o.threePointersAttempted)
        )
      ),
    ]);

    // League Average Hover & stuff
    let avgLine = d3
      .line()
      .defined((d) => !isNaN(d.average))
      .x((d) => vis.x(d.date))
      .y((d) => vis.y(d.average));

    let leagueLine = vis.svg.selectAll(".league-line").data([validData]);

    leagueLine
      .enter()
      .append("path")
      .attr("class", "league-line")
      .merge(leagueLine)
      .transition()
      .duration(800)
      .attr("d", avgLine)
      .attr("fill", "none")
      .attr("stroke-width", 5);
    // Add interactivity
    this.addInteractivity(validData);
    // Add outlier points
    let outlierData = validData.flatMap((d) =>
      d.outliers.map((o) => ({
        date: d.date,
        team: o.teamName,
        value: o.threePointersAttempted,
        average: d.average,
      }))
    );

    let outlierPoints = vis.svg.selectAll(".outlier").data(outlierData);

    // Remove old points
    outlierPoints.exit().remove();

    outlierPoints
      .enter()
      .append("circle")
      .attr("class", "outlier")
      .merge(outlierPoints)
      .attr("cx", (d) => vis.x(d.date))
      .attr("cy", (d) => vis.y(d.value))
      .attr("r", 6) // Fixed size for all points
      .attr("fill", (d) => (d.value > d.average ? "#AFE1AF" : "#E35335")) // Simple green/red coloring
      .on("mouseover", function (event, d) {
        vis.tooltip.transition().duration(200).style("opacity", 0.9);

        vis.tooltip
          .html(
            `
                    <strong>${d.team}</strong><br/>
                    Season: ${d.date.getFullYear()}<br/>
                    3-Pointers attempted per game: ${d.value.toFixed(1)}<br/>
                    League Average: ${d.average.toFixed(1)}<br/>
                `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");

        d3.select(this)
          .attr("r", 8)
          .style("stroke", "#333")
          .style("stroke-width", 2);
      })
      .on("mouseout", function () {
        vis.tooltip.transition().duration(500).style("opacity", 0);

        d3.select(this).attr("r", 6).style("stroke", "none");
      });

    // Update axes
    vis.xAxis.tickFormat(d3.timeFormat("%Y"));

    vis.xAxisGroup.transition().duration(800).call(vis.xAxis);

    vis.yAxisGroup.transition().duration(800).call(vis.yAxis);
  }
}
async function loadTrendLineData() {
  try {
    const data = await d3.csv("../Data/reg_total.csv");
    console.log("Raw data loaded:", data.length, "rows");

    const processedData = data.map((d) => ({
      season_year: d.SEASON_YEAR,
      teamName: d.TEAM_NAME,
      threePointersAttempted: +d.FG3A || 0,
      threePointersMade: +d.FG3M || 0,
    }));
    const trendVis = new NBALineVis("trend-container", processedData);
  } catch (error) {
    console.error("Emily data didn't load!", error);
  }
}
loadTrendLineData();

function wrap(text, width, string) {
  const words = string.split(/\s+/).reverse();
  let word,
    line = [],
    lineNumber = 0,
    lineHeight = 1.5,
    y = text.attr("y"),
    dy = 0,
    tspan = text
      .text(null)
      .append("tspan")
      .attr("x", text.attr("x"))
      .attr("y", y)
      .attr("dy", dy + "em");

  while ((word = words.pop())) {
    line.push(word);
    tspan.text(line.join(" "));
    if (tspan.node().getComputedTextLength() > width) {
      line.pop();
      tspan.text(line.join(" "));
      line = [word];
      tspan = text
        .append("tspan")
        .attr("x", text.attr("x"))
        .attr("y", y)
        .attr("dy", ++lineNumber * lineHeight + dy + "em")
        .text(word);
    }
  }
}
