import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { getProspects } from "@/store/data"; // Import your function

// Enum for prospect statuses
enum ProspectStatus {
  NOT_CONTACTED = "NOT_CONTACTED",
  CONTACTED = "CONTACTED",
  IN_PROGRESS = "IN_PROGRESS",
}

const COLORS = [
  "hsl(var(--chart-4))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

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

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="portal-card flex flex-col xl:flex-row items-center justify-center gap-6 h-full min-h-[16rem] px-6 py-5">
      <div className="flex flex-col items-start shrink-0">
        <h2 className="font-semibold text-base mb-4">Total Prospects</h2>
        {chartData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center mb-2">
            <div
              className="h-4 w-4 rounded-sm mr-2"
              style={{ backgroundColor: COLORS[index] }}
            />
            <div className="flex gap-2 font-bold">
              <span>{entry.value}</span>
              <span>{entry.name}</span>
            </div>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground px-6">No prospect activity yet.</p>
      ) : (
      <PieChart width={180} height={180}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={72}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
      )}
    </div>
  );
};

export default DonutChart;
