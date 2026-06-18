import React from 'react';

// Very small, dependency-free chart components using SVG.
export function BarChart({ title = '', data = [], xLabel = '', yLabel = '', maxHeight = 200 }) {
	const max = Math.max(...data.map(d => d.value || 0), 1);
	const barWidth = 30;
	const spacing = 10;
	const chartWidth = Math.max(300, data.length * (barWidth + spacing) + 40);
	const chartHeight = maxHeight;
	
	return (
		<div className="w-full">
			{title && <div className="text-sm font-medium mb-2 text-gray-700">{title}</div>}
			<div className="bg-white rounded p-2 border border-gray-200">
				<svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" style={{ minHeight: `${chartHeight}px` }}>
					{/* Grid lines for better readability */}
					{[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
						const y = chartHeight - 30 - (ratio * (chartHeight - 50));
						return (
							<line key={`grid-${ratio}`} x1="30" y1={y} x2={chartWidth - 10} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
						);
					})}
					{/* Y-axis */}
					<line x1="30" y1="10" x2="30" y2={chartHeight - 20} stroke="#374151" strokeWidth="2" />
					{/* X-axis */}
					<line x1="30" y1={chartHeight - 20} x2={chartWidth - 10} y2={chartHeight - 20} stroke="#374151" strokeWidth="2" />
					{/* Y-axis label */}
					{yLabel && <text x="15" y={chartHeight / 2} fontSize="11" fill="#6b7280" textAnchor="middle" transform={`rotate(-90, 15, ${chartHeight / 2})`}>{yLabel}</text>}
					{/* Data bars */}
					{data.map((d, i) => {
						const h = max > 0 ? (d.value / max) * (chartHeight - 50) : 0;
						const x = 40 + i * (barWidth + spacing);
						const y = chartHeight - 20 - h;
						const value = d.value || 0;
						return (
							<g key={i}>
								<rect x={x} y={y} width={barWidth} height={h} fill={d.color || '#3b82f6'} stroke="#fff" strokeWidth="1" rx="2" />
								{/* Value label on top of bar */}
								<text x={x + barWidth / 2} y={y - 5} fontSize="10" textAnchor="middle" fill="#374151" fontWeight="500">{value}</text>
								{/* X-axis label */}
								<text x={x + barWidth / 2} y={chartHeight - 5} fontSize="10" textAnchor="middle" fill="#6b7280">{d.label}</text>
							</g>
						);
					})}
				</svg>
			</div>
		</div>
	);
}

export function LineChart({ title = '', data = [], xLabel = '', yLabel = '', maxHeight = 200 }) {
	const max = Math.max(...data.map(d => d.value || 0), 1);
	const chartWidth = Math.max(400, data.length * 50);
	const chartHeight = maxHeight;
	const padding = { top: 20, right: 20, bottom: 40, left: 50 };
	const plotWidth = chartWidth - padding.left - padding.right;
	const plotHeight = chartHeight - padding.top - padding.bottom;
	
	const points = data.map((d, i) => {
		const x = padding.left + (i / Math.max(1, data.length - 1)) * plotWidth;
		const y = padding.top + plotHeight - ((d.value / max) * plotHeight);
		return `${x},${y}`;
	}).join(' ');
	
	return (
		<div className="w-full">
			{title && <div className="text-sm font-medium mb-2 text-gray-700">{title}</div>}
			<div className="bg-white rounded p-2 border border-gray-200">
				<svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" style={{ minHeight: `${chartHeight}px` }}>
					{/* Grid lines */}
					{[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
						const y = padding.top + plotHeight - (ratio * plotHeight);
						return (
							<line key={`grid-${ratio}`} x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
						);
					})}
					{/* Y-axis */}
					<line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#374151" strokeWidth="2" />
					{/* X-axis */}
					<line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#374151" strokeWidth="2" />
					{/* Y-axis label */}
					{yLabel && <text x="15" y={chartHeight / 2} fontSize="11" fill="#6b7280" textAnchor="middle" transform={`rotate(-90, 15, ${chartHeight / 2})`}>{yLabel}</text>}
					{/* X-axis label */}
					{xLabel && <text x={chartWidth / 2} y={chartHeight - 5} fontSize="11" fill="#6b7280" textAnchor="middle">{xLabel}</text>}
					{/* Data line */}
					<polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />
					{/* Data points */}
					{data.map((d, i) => {
						const x = padding.left + (i / Math.max(1, data.length - 1)) * plotWidth;
						const y = padding.top + plotHeight - ((d.value / max) * plotHeight);
						return (
							<g key={i}>
								<circle cx={x} cy={y} r={5} fill={d.color || '#3b82f6'} stroke="#fff" strokeWidth="2" />
								{/* Value label */}
								<text x={x} y={y - 10} fontSize="9" textAnchor="middle" fill="#374151" fontWeight="500">{d.value}</text>
								{/* X-axis label */}
								<text x={x} y={chartHeight - padding.bottom + 15} fontSize="9" textAnchor="middle" fill="#6b7280">{d.label}</text>
							</g>
						);
					})}
				</svg>
			</div>
		</div>
	);
}

export function PieChart({ title = '', data = [], maxHeight = 200 }) {
	const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
	let angle = -Math.PI / 2;
	const cx = 120, cy = 120, r = 90;
	const slices = data.map((d, i) => {
		const frac = (d.value || 0) / total;
		const next = angle + frac * Math.PI * 2;
		const x1 = cx + r * Math.cos(angle);
		const y1 = cy + r * Math.sin(angle);
		const x2 = cx + r * Math.cos(next);
		const y2 = cy + r * Math.sin(next);
		const large = frac > 0.5 ? 1 : 0;
		const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
		const midAngle = angle + (frac * Math.PI);
		const labelX = cx + (r * 0.7) * Math.cos(midAngle);
		const labelY = cy + (r * 0.7) * Math.sin(midAngle);
		angle = next;
		return { 
			path, 
			color: d.color || ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6'][i%7], 
			label: d.label, 
			value: d.value,
			percentage: ((d.value / total) * 100).toFixed(1),
			labelX,
			labelY
		};
	});

	return (
		<div className="w-full">
			{title && <div className="text-sm font-medium mb-3 text-gray-700">{title}</div>}
			<div className="bg-white rounded p-3 border border-gray-200">
				<div className="flex flex-col md:flex-row items-start gap-4">
					<div className="flex-shrink-0">
						<svg width={240} height={240} viewBox="0 0 240 240" className="mx-auto">
							{slices.map((s, i) => (
								<g key={i}>
									<path d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" />
									{/* Percentage label on slice */}
									{s.percentage > 5 && (
										<text 
											x={s.labelX} 
											y={s.labelY} 
											fontSize="11" 
											fill="#fff" 
											textAnchor="middle" 
											dominantBaseline="middle"
											fontWeight="600"
											style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
										>
											{s.percentage}%
										</text>
									)}
								</g>
							))}
						</svg>
					</div>
					<div className="flex-1 text-sm space-y-2">
						{slices.map((s, i) => (
							<div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
								<span style={{width:16,height:16,background:s.color,display:'inline-block',borderRadius:'2px',border:'1px solid #fff'}} />
								<div className="flex-1">
									<div className="font-semibold text-gray-800">{s.label}</div>
									<div className="text-xs text-gray-600">Value: {s.value} ({s.percentage}%)</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default { BarChart, LineChart, PieChart };
