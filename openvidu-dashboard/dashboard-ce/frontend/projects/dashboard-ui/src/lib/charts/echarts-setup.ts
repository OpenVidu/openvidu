import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
	AriaComponent,
	BrushComponent,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	MarkAreaComponent,
	MarkLineComponent,
	TooltipComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

// No DataZoom component is registered: charts cannot zoom, so wheel and drag always scroll the page.
echarts.use([
	AriaComponent,
	BarChart,
	BrushComponent,
	CanvasRenderer,
	GraphicComponent,
	GridComponent,
	LegendComponent,
	LineChart,
	MarkAreaComponent,
	MarkLineComponent,
	PieChart,
	TooltipComponent
]);

export { echarts };
