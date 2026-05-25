"use client";

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie 
} from "recharts";

interface HourlySale {
  time: string;
  revenue: number;
}

interface FuelData {
  name: string;
  value: number;
  fill: string;
}

interface PaymentData {
  name: string;
  value: number;
  fill: string;
}

// 1. Dashboard Page - Revenue Velocity Area Chart
export function RevenueVelocityChart({ data }: { data: HourlySale[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0066ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0066ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis hide />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "#0d0f17", 
            border: "1px solid rgba(255, 255, 255, 0.08)", 
            borderRadius: "12px",
            color: "#f8fafc" 
          }}
          itemStyle={{ color: "#0066ff" }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#0066ff" strokeWidth={3} fill="url(#velocityGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 2. Sales Page - Revenue by Fuel Type Bar Chart
export function FuelDistributionChart({ data }: { data: FuelData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v/1000}k`} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "rgba(13, 15, 23, 0.95)", 
            border: "1px solid rgba(255,255,255,0.08)", 
            borderRadius: "8px" 
          }} 
          itemStyle={{ color: "#fff" }} 
          cursor={{ fill: "rgba(255,255,255,0.04)" }} 
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 3. Sales Page - Payment Method Split Pie Chart
export function PaymentSplitChart({ data }: { data: PaymentData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "rgba(13, 15, 23, 0.95)", 
            border: "1px solid rgba(255,255,255,0.08)", 
            borderRadius: "8px" 
          }} 
          itemStyle={{ color: "#fff" }} 
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
