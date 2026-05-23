import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { getProspects } from "@/store/data"; // Import your function

// Enum for prospect statuses
enum ProspectStatus {
  NOT_CONTACTED = "NOT_CONTACTED",
  CONTACTED = "CONTACTED",
  IN_PROGRESS = "IN_PROGRESS",
}

const COLORS = ["#F29425", "#10A142", "#E54F53"]; // Colors for each status

/** Maximum number of prospects to fetch for the dashboard chart. */
const CHART_PROSPECTS_LIMIT = 100;

const DonutChart: React.FC = () => {
  const [chartData, setChartData] = useState([
    { name: "Not Contacted", value: 0 },
    { name: "Contacted", value: 0 },
    { name: "In-Progress", value: 0 },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getProspects(CHART_PROSPECTS_LIMIT, 0);
      const prospects = (res.data ?? []) as { status?: ProspectStatus }[];

      // Initialize counts
      const counts = {
        [ProspectStatus.NOT_CONTACTED]: 0,
        [ProspectStatus.CONTACTED]: 0,
        [ProspectStatus.IN_PROGRESS]: 0,
      };

      // Count occurrences of each status (from current page, max CHART_PROSPECTS_LIMIT)
      prospects.forEach((prospect) => {
        if (prospect.status != null && counts[prospect.status] !== undefined) {
          counts[prospect.status]++;
        }
      });

      // Convert to chart data format
      setChartData([
        { name: "Not Contacted", value: counts[ProspectStatus.NOT_CONTACTED] },
        { name: "Contacted", value: counts[ProspectStatus.CONTACTED] },
        { name: "In-Progress", value: counts[ProspectStatus.IN_PROGRESS] },
      ]);
    };

    fetchData();
  }, []);

  return (
    <div className="flex justify-around items-center bg-white rounded-xl h-full">
      {/* Legend Section */}
      <div className="flex flex-col items-start mr-4 p-2">
        <h1 className="font-bold text-xl mb-6">Total Prospects</h1>
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center mb-2">
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: COLORS[index],
                marginRight: 8,
              }}
            ></div>
            <div className="flex gap-2 font-bold">
              <span>{entry.value}</span>
              <span>{entry.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Donut Chart Section */}
      <PieChart width={250} height={250}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={100}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </div>
  );
};

export default DonutChart;
