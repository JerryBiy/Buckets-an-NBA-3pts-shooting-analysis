class TeamScoringVis {
  constructor(parentElement, data) {
    this.parentElement = parentElement;
    this.data = data;
    this.selectedTeam = null;
    this.initVisualization();
  }

  initVisualization() {
    this.setupTeamSelector();
    this.setupLayout();
    this.setupScales();
    this.setupAxes();
    this.setupTooltip();
    this.processData();
  }

  setupTeamSelector() {
    this.teams = [...new Set(this.data.map((d) => d.teamName))].sort();
    this.selectedTeam =
      this.teams[Math.floor(Math.random() * this.teams.length - 1)];

    this.selector = d3
      .select(`#${this.parentElement}`)
      .append("select")
      .attr("id", "teamSelector")
      .style("margin", "20px")
      .on("change", () => {
        this.selectedTeam = this.selector.property("value");
        this.processData();
      });

    this.selector
      .selectAll("option")
      .data(this.teams)
      .enter()
      .append("option")
      .text((team) => team)
      .attr("value", (team) => team);
  }

  setupLayout() {
    this.margin = { top: 60, right: 300, bottom: 60, left: 80 };
    this.width = 950 - this.margin.left - this.margin.right;
    this.height = 500 - this.margin.top - this.margin.bottom;

    this.svg = d3
      .select(`#${this.parentElement}`)
      .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", this.width / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .text("Average Game Breakdown");

    this.svg
      .append("text")
      .attr("class", "chart-description")
      .attr("x", this.width + 40)
      .attr("y", 0)
      .attr("width", 250)
      .style("font-size", "16px")
      .style("fill", "#2c3e50")
      .style("line-height", "1.5")
      .call(
        wrap,
        250,
        "The Game Breakdown Stacked Bar Chart shows the average game's point breakdown for each of the NBA teams from the 2010 to the 2024 season. This effectively shows how the proportion of the game points from free throws, 2-pointers, and 3-pointers changed over time."
      );
  }

  setupScales() {
    this.x = d3.scaleBand().range([0, this.width]).padding(0.1);

    this.y = d3.scaleLinear().range([this.height, 0]);

    this.color = d3
      .scaleOrdinal()
      .domain(["Three-Pointers", "Two-Pointers", "Free Throws"])
      .range(["#B0E0E6", "#8FBC8B", "#DDA0DD"]);
  }

  setupAxes() {
    this.xAxis = d3.axisBottom(this.x);
    this.yAxis = d3.axisLeft(this.y).tickFormat((d) => d3.format(",")(d));

    this.xAxisGroup = this.svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${this.height})`);

    this.yAxisGroup = this.svg.append("g").attr("class", "y-axis");

    this.svg
      .append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -60)
      .attr("x", -this.height / 2)
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .text("Points");
  }

  setupTooltip() {
    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  }

  processData() {
    const teamData = this.data.filter((d) => d.teamName === this.selectedTeam);
    const nestedData = d3.group(teamData, (d) => d.season_year);

    this.displayData = Array.from(nestedData, ([year, values]) => {
      const numGames = values.length;
      let totalPoints = 0,
        threePoints = 0,
        twoPoints = 0;

      values.forEach((game) => {
        totalPoints += +game.points;
        threePoints += +game.threePointersMade * 3;
        twoPoints += (+game.fieldGoalsMade - +game.threePointersMade) * 2;
      });

      const freeThrows = totalPoints - threePoints - twoPoints;

      return {
        season: year,
        "Three-Pointers": threePoints / numGames,
        "Two-Pointers": twoPoints / numGames,
        "Free Throws": freeThrows / numGames,
      };
    });

    this.displayData.sort((a, b) => d3.ascending(a.season, b.season));
    this.updateVisualization();
  }

  updateVisualization() {
    this.x.domain(this.displayData.map((d) => d.season));
    this.y.domain([
      0,
      d3.max(
        this.displayData,
        (d) => d["Three-Pointers"] + d["Two-Pointers"] + d["Free Throws"]
      ),
    ]);

    const stackedData = d3
      .stack()
      .keys(["Three-Pointers", "Two-Pointers", "Free Throws"])(
      this.displayData
    );

    const categories = this.svg.selectAll(".category").data(stackedData);

    categories.exit().remove();

    const categoriesEnter = categories
      .enter()
      .append("g")
      .attr("class", "category")
      .attr("fill", (d) => this.color(d.key));

    categories.merge(categoriesEnter);

    const rectangles = categories.selectAll("rect").data((d) => d);

    rectangles.exit().remove();

    rectangles
      .enter()
      .append("rect")
      .merge(rectangles)
      .attr("x", (d) => this.x(d.data.season))
      .attr("y", (d) => this.y(d[1]))
      .attr("height", (d) => this.y(d[0]) - this.y(d[1]))
      .attr("width", this.x.bandwidth())
      .on("mouseover", (event, d) => {
        const threePointers = d.data["Three-Pointers"];
        const twoPointers = d.data["Two-Pointers"];
        const freeThrows = d.data["Free Throws"];
        const totalPoints = threePointers + twoPointers + freeThrows;

        this.tooltip
          .style("opacity", 1)
          .html(
            `
              3-Pointers: ${d3.format(".1f")(threePointers)} pts<br>
              2-Pointers: ${d3.format(".1f")(twoPointers)} pts<br>
              Free Throws: ${d3.format(".1f")(freeThrows)} pts<br>
              Total Avg Points: ${d3.format(".1f")(totalPoints)}
            `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", () => {
        this.tooltip.style("opacity", 0);
      });

    this.xAxisGroup.call(this.xAxis);
    this.yAxisGroup.call(this.yAxis);
  }
}
async function loadData() {
  try {
    const data = await d3.csv("data/reg_total.csv");

    const processedData = data.map((d) => ({
      season_year: d.SEASON_YEAR,
      teamName: d.TEAM_NAME,
      fieldGoalsMade: +d.FGM,
      threePointersMade: +d.FG3M,
      points: +d.PTS,
    }));

    new TeamScoringVis("visualization-container", processedData);
  } catch (error) {
    console.error("Error loading the data:", error);
  }
}

loadData()
  .then(() => {
    console.log("Data Good");
  })
  .catch((error) => {
    console.error("Emily you made a mistake!", error);
  });

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
