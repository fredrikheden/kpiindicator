//var sFontFamilyHeading: any = "font-family:wf_standard-font, helvetica, arial, sans-serif;"
//var sFontFamily: any = "font-family:'Segoe UI',wf_segoe-ui_normal,helvetica,arial,sans-serif;";
var sFontFamilyHeading: any = ""
var sFontFamily: any = "";

import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;


module powerbi.extensibility.visual {

    interface KPIViewModel {
        dataPoints: KPIDataPoint[];
        settings: KPISettings;
        borderSettings: BorderSettings;
        categoryDimName: string;
    };

    interface KPIDataPoint {
        actual: number;
        trendActual: number;
        actualAggregated: number;
        trendTarget: number;
        target: number;
        count: number;
        targetAggregated: number;
        countAggregated: number;
        index: number;
        category: string;
        x: number;
        y: number;
        w: number;
        h: number;
        dataId: string;
        tooltipInfo: any[];
    };

    interface KPISettings {
        kpiColors: {
            colorGood: Fill;
            colorNeutral: Fill;
            colorBad: Fill;
            colorNone: Fill;
            colorText: Fill;
        }
        ,
        kpiFonts: {
            show: boolean;
            sizeHeading: number;
            sizeActual: number;
            sizeDeviation: number;
            sizeDetails: number;
        }
        ,
        kpi: {
            kpiName: string;
            bandingPercentage: number;
            bandingType: string;
            bandingCompareType: string;
            indicateDifferenceAsPercent: boolean;
            chartType: string;
            forceThousandSeparator: boolean;
            fixedTarget: number;
            displayDeviation: boolean;
            displayDetails: boolean;
            constantActual: string;
            constantTarget: string;
            constantCount: string;
            customFormat: string;
            aggregationType: string;
            minimumDataPointsForTrendToBeShown: number;
            customStartY: number;
            customEndY: number;
        }
        ;
    }

    interface BorderSettings {
        show: boolean;
        topColor: Fill;
        rightColor: Fill;
        bottomColor: Fill;
        leftColor: Fill;
        type: string;
        width: number;
    };

    function GetStatusColor(dActual, dGoal, oBandingType, oBandingCompareType, dPercentBanding, thisRef:Visual) {
        var StatusColor = { RED: thisRef.kpiCurrentSettings.kpiColors.colorBad, YELLOW: thisRef.kpiCurrentSettings.kpiColors.colorNeutral, GREEN: thisRef.kpiCurrentSettings.kpiColors.colorGood };

        var ReturnStatusColor = StatusColor.YELLOW;
        var dActualBandingGY, dActualBandingRY;
        switch (oBandingType) {
            case "IIB":
                dActualBandingGY = dGoal;
                dActualBandingRY = GetBandingActual(dGoal, (1 - dPercentBanding), dPercentBanding, oBandingCompareType);
                if (dActual >= dActualBandingGY) {
                    ReturnStatusColor = StatusColor.GREEN;
                }
                else if (dActual <= dActualBandingRY) {
                    ReturnStatusColor = StatusColor.RED;
                }
                break;
            case "DIB":
                dActualBandingGY = dGoal;
                dActualBandingRY = GetBandingActual(dGoal, (1 + dPercentBanding), -dPercentBanding, oBandingCompareType);
                if (dActual <= dActualBandingGY) {
                    ReturnStatusColor = StatusColor.GREEN;
                }
                else if (dActual > dActualBandingRY) {
                    ReturnStatusColor = StatusColor.RED;
                }
                break;
            case "CIB":
                var dActualBandingGY_Pos = GetBandingActual(dGoal, (1 + (dPercentBanding * 0.5)), -(dPercentBanding * 0.5), oBandingCompareType);
                var dActualBandingGY_Neg = GetBandingActual(dGoal, (1 - (dPercentBanding * 0.5)), (dPercentBanding * 0.5), oBandingCompareType);
                var dActualBandingRY_Pos = GetBandingActual(dGoal, (1 + (dPercentBanding * 1.5)), -(dPercentBanding * 1.0), oBandingCompareType);
                var dActualBandingRY_Neg = GetBandingActual(dGoal, (1 - (dPercentBanding * 1.5)), (dPercentBanding * 1.0), oBandingCompareType);
                if (dActual <= dActualBandingGY_Pos && dActual >= dActualBandingGY_Neg) {
                    ReturnStatusColor = StatusColor.GREEN;
                }
                else if (dActual > dActualBandingRY_Pos || dActual < dActualBandingRY_Neg) {
                    ReturnStatusColor = StatusColor.RED;
                }
                break;
            default:
                break;
        }
        return ReturnStatusColor;
    }
    function GetBandingActual(dGoal, dPercentBandingCalculated, dPercentBanding, oBandingCompareType) {
        var retValue = 0;
        if (oBandingCompareType === "REL") {
            retValue = dGoal * dPercentBandingCalculated;
        }
        else if (oBandingCompareType === "ABS") {
            retValue = dGoal - dPercentBanding;
        }
        return retValue;
    }

    function GetKPIActualDiffFromGoal(dActual, dGoal, oBandingCompareType, bDisplayDiffAsPercent) {
        var retValue = "";
        var PercMulti = 10;
        var PercSign = "";
        if (bDisplayDiffAsPercent) {
            PercMulti = 1000;
            PercSign = " %";
        }
        var relNum = 0;
        if (oBandingCompareType === "REL") {
            relNum = (dActual - dGoal) / dGoal;
            retValue += Math.round(PercMulti * (dActual - dGoal) / dGoal) / 10 + PercSign;
        }
        else if (oBandingCompareType === "ABS") {
            relNum = (dActual - dGoal);
            retValue += Math.round(PercMulti * (dActual - dGoal)) / 10 + PercSign;
        }
        if (relNum > 0) {
            retValue = "+" + retValue;
        }
        return retValue;
    }
    
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost, thisRef: Visual): KPIViewModel {
        let dataViews = options.dataViews;
        let defaultSettings: KPISettings = {
            kpiFonts: {
                show: false,
                sizeHeading: 20,
                sizeActual: 30,
                sizeDeviation: 15,
                sizeDetails: 10
            }
            ,
            kpiColors: {
                colorGood: { solid: { color: "#7DC172" } },
                colorNeutral: { solid: { color: "#F6C000" } },
                colorBad: { solid: { color: "#DC0002" } },
                colorNone: { solid: { color: "#999999" } },
                colorText: { solid: { color: "#000000" } }
            }
            ,
            kpi: {
                kpiName: "",
                bandingPercentage: 5,
                bandingType: "IIB",
                bandingCompareType: "REL",
                indicateDifferenceAsPercent: true,
                chartType: "LINE",
                forceThousandSeparator: false,
                fixedTarget: null,
                displayDeviation: true,
                displayDetails: true,
                constantActual: "Actual",
                constantTarget: "Target",
                constantCount: "Count",
                customFormat: "",
                aggregationType: "LAST",
                minimumDataPointsForTrendToBeShown: 1,
                customStartY: null,
                customEndY: null
            }
        }; 

        let defaultBorderSettings: BorderSettings = {
            show: false,
            topColor: { solid: { color: "#000000" } },
            rightColor: { solid: { color: "#000000" } },
            bottomColor: { solid: { color: "#000000" } },
            leftColor: { solid: { color: "#000000" } },
            type: "A",
            width: 1
        }

        let viewModel: KPIViewModel = {
            dataPoints: [],
            settings: <KPISettings>{},
            borderSettings: <BorderSettings>{},
            categoryDimName: ""
        };      

        if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.values
        )
            return viewModel;
        
        var hasCategories = true;
        if (typeof dataViews[0].categorical.categories === 'undefined') {
            hasCategories = false;
        }

        let objects = dataViews[0].metadata.objects;
        let kpiSettings: KPISettings = {
            kpiFonts: {
                show: getValue<boolean>(objects, 'kpiFonts', 'show', defaultSettings.kpiFonts.show),
                sizeHeading: getValue<number>(objects, 'kpiFonts', 'pKPIFontSizeHeading', defaultSettings.kpiFonts.sizeHeading),
                sizeActual: getValue<number>(objects, 'kpiFonts', 'pKPIFontSizeActual', defaultSettings.kpiFonts.sizeActual),
                sizeDeviation: getValue<number>(objects, 'kpiFonts', 'pKPIFontSizeDeviation', defaultSettings.kpiFonts.sizeDeviation),
                sizeDetails: getValue<number>(objects, 'kpiFonts', 'pKPIFontSizeDetails', defaultSettings.kpiFonts.sizeDetails)
            }
            ,
            kpiColors: {
                colorGood: getValue<Fill>(objects, 'kpiColors', 'pKPIColorGood', defaultSettings.kpiColors.colorGood),
                colorNeutral: getValue<Fill>(objects, 'kpiColors', 'pKPIColorNeutral', defaultSettings.kpiColors.colorNeutral),
                colorBad: getValue<Fill>(objects, 'kpiColors', 'pKPIColorBad', defaultSettings.kpiColors.colorBad),
                colorNone: getValue<Fill>(objects, 'kpiColors', 'pKPIColorNone', defaultSettings.kpiColors.colorNone),
                colorText: getValue<Fill>(objects, 'kpiColors', 'pKPIColorText', defaultSettings.kpiColors.colorText)
            }
            ,
            kpi: {
                kpiName: getValue<string>(objects, 'kpi', 'pKPIName', defaultSettings.kpi.kpiName),
                bandingPercentage: getValue<number>(objects, 'kpi', 'pBandingPercentage', defaultSettings.kpi.bandingPercentage),
                bandingType: getValue<string>(objects, 'kpi', 'pBandingType', defaultSettings.kpi.bandingType),
                bandingCompareType: getValue<string>(objects, 'kpi', 'pBandingCompareType', defaultSettings.kpi.bandingCompareType),
                indicateDifferenceAsPercent: getValue<boolean>(objects, 'kpi', 'pIndicateDifferenceAsPercent', defaultSettings.kpi.indicateDifferenceAsPercent),
                chartType: getValue<string>(objects, 'kpi', 'pChartType', defaultSettings.kpi.chartType),
                forceThousandSeparator: getValue<boolean>(objects, 'kpi', 'pForceThousandSeparator', defaultSettings.kpi.forceThousandSeparator),
                fixedTarget: getValue<number>(objects, 'kpi', 'pFixedTarget', defaultSettings.kpi.fixedTarget),
                displayDeviation: getValue<boolean>(objects, 'kpi', 'pDisplayDeviation', defaultSettings.kpi.displayDeviation),
                displayDetails: getValue<boolean>(objects, 'kpi', 'pDisplayDetails', defaultSettings.kpi.displayDetails),
                constantActual: getValue<string>(objects, 'kpi', 'pConstantActual', defaultSettings.kpi.constantActual),
                constantTarget: getValue<string>(objects, 'kpi', 'pConstantTarget', defaultSettings.kpi.constantTarget),
                constantCount: getValue<string>(objects, 'kpi', 'pConstantCount', defaultSettings.kpi.constantCount),
                customFormat: getValue<string>(objects, 'kpi', 'pCustomFormat', defaultSettings.kpi.customFormat),
                aggregationType: getValue<string>(objects, 'kpi', 'pAggregationType', defaultSettings.kpi.aggregationType),
                minimumDataPointsForTrendToBeShown: getValue<number>(objects, 'kpi', 'pMinimumDataPointsForTrendToBeShown', defaultSettings.kpi.minimumDataPointsForTrendToBeShown),
                customStartY: getValue<number>(objects, 'kpi', 'pCustomStartY', defaultSettings.kpi.customStartY),
                customEndY: getValue<number>(objects, 'kpi', 'pCustomEndY', defaultSettings.kpi.customEndY)
            }
        }

        let borderSettings: BorderSettings = {
            show: getValue<boolean>(objects, 'customBorder', 'show', defaultBorderSettings.show),
            topColor: getValue<Fill>(objects, 'customBorder', 'pColorTopBorder', defaultBorderSettings.topColor),
            rightColor: getValue<Fill>(objects, 'customBorder', 'pColorRightBorder', defaultBorderSettings.rightColor),
            bottomColor: getValue<Fill>(objects, 'customBorder', 'pColorBottomBorder', defaultBorderSettings.bottomColor),
            leftColor: getValue<Fill>(objects, 'customBorder', 'pColorLeftBorder', defaultBorderSettings.leftColor),
            type: getValue<string>(objects, 'customBorder', 'pBorderType', defaultBorderSettings.type),
            width: getValue<number>(objects, 'customBorder', 'pBorderWidth', defaultBorderSettings.width)
        }

        let categorical = dataViews[0].categorical;
        let category = null;
        if (hasCategories) {
            category = categorical.categories[0];
        }
        let dataValue = categorical.values[0];

        let ActualsIndex = getMeasureIndex(categorical, "Values");
        let TargetsIndex = getMeasureIndex(categorical, "Targets");
        let CountsIndex = getMeasureIndex(categorical, "Counts");
        let TrendActualsIndex = getMeasureIndex(categorical, "ValuesTrendActual");
        let TrendTargetsIndex = getMeasureIndex(categorical, "ValuesTrendTarget");
        let TrendIndex = getMetadataColumnIndex(options.dataViews[0].metadata, "Category")

        thisRef.kpiTargetExists = TargetsIndex === -1 && kpiSettings.kpi.fixedTarget === null ? false : true;
        thisRef.kpiActualExists = ActualsIndex === -1 ? false : true;
        thisRef.kpiCountExists = CountsIndex === -1 ? false : true;
        thisRef.kpiDynamicTargetExists = TargetsIndex === -1 ? false : true;
        thisRef.kpiTrendActualExists = TrendActualsIndex === -1 ? false : true;
        thisRef.kpiTrendTargetExists = TrendTargetsIndex === -1 ? false : true;

        if (!thisRef.kpiActualExists) {
            return {
                dataPoints: viewModel.dataPoints,
                settings: kpiSettings,
                borderSettings: borderSettings,
                categoryDimName: viewModel.categoryDimName
            }
        }

        // Get metadata for formatting
        let mdCol = thisRef.getMetaDataColumn(options.dataViews[0]);
        let trendMetadataCol = TrendIndex === -1 ? mdCol : options.dataViews[0].metadata.columns[TrendIndex];

        var format = mdCol.format;
        if ( kpiSettings.kpi.customFormat !== null && kpiSettings.kpi.customFormat !== undefined && kpiSettings.kpi.customFormat.length > 0) {
            format = kpiSettings.kpi.customFormat;
        }

        let kpiDataPoints: KPIDataPoint[] = [];

        var NoOfCategories = 1;
        if (hasCategories) {
            NoOfCategories = category.values.length;
        }

        for (let i = 0, len = Math.max(NoOfCategories, dataValue.values.length); i < len; i++) {
            
            var targetValue = TargetsIndex === -1 ? null : <number>categorical.values[TargetsIndex].values[i];
            if (kpiSettings.kpi.fixedTarget !== null && TargetsIndex === -1) { // Target is only set to static value if no dynamic target is set
                targetValue = kpiSettings.kpi.fixedTarget;
            }
            var actualValue = ActualsIndex === -1 ? null : <number>categorical.values[ActualsIndex].values[i];
            var countValue = CountsIndex === -1 ? null : <number>categorical.values[CountsIndex].values[i];
            var actualTrendValue = TrendActualsIndex === -1 ? actualValue : <number>categorical.values[TrendActualsIndex].values[i];
            var targetTrendValue = TrendTargetsIndex === -1 ? targetValue : <number>categorical.values[TrendTargetsIndex].values[i];

            var toolTipArr = [];
            var CategoryName = "";
            if (hasCategories) {
                var formattedCategory = valueFormatter.format(category.values[i], trendMetadataCol.format);
                toolTipArr.push({ displayName: category.source.displayName, value: formattedCategory });
                CategoryName = formattedCategory;
            }
            if (actualValue !== null) {
                var formattedActual = valueFormatter.format(actualValue, format);
                if (kpiSettings.kpi.forceThousandSeparator) {
                    formattedActual = Math.round(actualValue).toLocaleString();
                }
                if (TrendActualsIndex === -1) {
                    toolTipArr.push({ displayName: kpiSettings.kpi.constantActual, value: formattedActual });
                }
            }
            if (actualTrendValue !== null) {
                var formattedTrendActual = valueFormatter.format(actualTrendValue, format);
                if (kpiSettings.kpi.forceThousandSeparator) {
                    formattedTrendActual = Math.round(actualTrendValue).toLocaleString();
                }
                if (TrendActualsIndex !== -1) {
                    toolTipArr.push({ displayName: kpiSettings.kpi.constantActual, value: formattedTrendActual });
                }
            }
            if (targetValue !== null) {
                var formattedTarget = valueFormatter.format(targetValue, format);
                if (kpiSettings.kpi.forceThousandSeparator) {
                    formattedTarget = Math.round(targetValue).toLocaleString();
                }
                if (TrendTargetsIndex === -1) {
                    toolTipArr.push({ displayName: kpiSettings.kpi.constantTarget, value: formattedTarget });
                }
            }
            if (targetTrendValue !== null) {
                var formattedTrendTarget = valueFormatter.format(targetTrendValue, format);
                if (kpiSettings.kpi.forceThousandSeparator) {
                    formattedTrendTarget = Math.round(targetTrendValue).toLocaleString();
                }
                if (TrendTargetsIndex !== -1) {
                    toolTipArr.push({ displayName: kpiSettings.kpi.constantTarget, value: formattedTrendTarget});
                }
            }
            if (countValue !== null) {
                var formattedCount = valueFormatter.format(countValue, "0");
                if (kpiSettings.kpi.forceThousandSeparator) {
                    formattedCount = Math.round(countValue).toLocaleString();
                }
                if (CountsIndex !== -1) {
                    toolTipArr.push({ displayName: kpiSettings.kpi.constantCount, value: formattedCount });
                }
            }
            
            kpiDataPoints.push({
                index: i,
                actual: actualValue,
                trendActual: actualTrendValue,
                trendTarget: targetTrendValue,
                target: targetValue,
                count: countValue,
                category: CategoryName,
                x: null,
                y: null,
                w: null,
                h:null,
                dataId: null,
                tooltipInfo: toolTipArr,
                actualAggregated: 0,
                targetAggregated: 0,
                countAggregated: 0
            });
            
        }

        // Calculate aggregation
        var aggActualSum = 0.0;
        var aggActualAvg = 0.0;
        var aggCountSum = 0.0;
        var aggCountAvg = 0.0;
        var aggTargetSum = 0.0;
        var aggTargetAvg = 0.0;
        for(let i=0; i<kpiDataPoints.length; i++) {
            if ( kpiSettings.kpi.aggregationType === "LAST" ) {
                kpiDataPoints[i].actualAggregated = kpiDataPoints[i].actual;
                kpiDataPoints[i].targetAggregated = kpiDataPoints[i].target;
                kpiDataPoints[i].countAggregated = kpiDataPoints[i].count;
            }
            else if ( kpiSettings.kpi.aggregationType === "SUM" ) {
                aggActualSum += kpiDataPoints[i].actual;
                aggTargetSum += kpiDataPoints[i].target;
                aggCountSum += kpiDataPoints[i].count;
                kpiDataPoints[i].actualAggregated = aggActualSum;
                kpiDataPoints[i].targetAggregated = aggTargetSum;
                kpiDataPoints[i].countAggregated = aggCountSum;
            }
            else if ( kpiSettings.kpi.aggregationType === "AVERAGE" ) {
                aggActualAvg += kpiDataPoints[i].actual / kpiDataPoints.length;
                aggTargetAvg += kpiDataPoints[i].target / kpiDataPoints.length;
                aggCountAvg += kpiDataPoints[i].count / kpiDataPoints.length;
                kpiDataPoints[i].actualAggregated = aggActualAvg;
                kpiDataPoints[i].targetAggregated = aggTargetAvg;
                kpiDataPoints[i].countAggregated = aggCountAvg;
            }
        }

        return {
            dataPoints: kpiDataPoints,
            settings: kpiSettings,
            borderSettings: borderSettings,
            categoryDimName: categorical.values[ActualsIndex].source.displayName
        };
        
    }

    export class Visual implements IVisual {
        private host: IVisualHost;
        private updateCount: number;

        private svg: d3.Selection<SVGElement>;

        private sMainGroupElement: d3.Selection<SVGElement>;
        private sMainGroupElement2: d3.Selection<SVGElement>;
        private sMainRect: d3.Selection<SVGElement>;
        private sKPIText: d3.Selection<SVGElement>;
        private sKPIActualText: d3.Selection<SVGElement>;
        private sKPIActualDiffText: d3.Selection<SVGElement>;
        private sKPIDetailsText: d3.Selection<SVGElement>;
        private sLinePath: d3.Selection<SVGElement>;
        private sTopCustomBorder: d3.Selection<SVGElement>;
        private sRightCustomBorder: d3.Selection<SVGElement>;
        private sBottomCustomBorder: d3.Selection<SVGElement>;
        private sLeftCustomBorder: d3.Selection<SVGElement>;

        public kpiCurrentSettings: KPISettings;
        public borderCurrentSettings: BorderSettings;

        private kpiDataPoints: KPIDataPoint[];
        
        public kpiTargetExists: boolean;
        public kpiActualExists: boolean;
        public kpiCountExists: boolean;
        public kpiDynamicTargetExists: boolean;
        public kpiTrendActualExists: boolean;
        public kpiTrendTargetExists: boolean;

        private tooltipServiceWrapper: ITooltipServiceWrapper;

        constructor(options: VisualConstructorOptions) {

            this.host = options.host;
            let svg = this.svg = d3.select(options.element)
                .append('svg')
                .classed('kpiIndicator', true);
           
            this.sMainGroupElement = this.svg.append('g');
            
            this.sMainGroupElement2 = this.svg.append('g');
            this.sMainRect = this.sMainGroupElement.append("rect");
            this.sKPIText = this.sMainGroupElement.append("text");
            this.sKPIActualText = this.sMainGroupElement.append("text");
            this.sKPIActualDiffText = this.sMainGroupElement.append("text");
            this.sKPIDetailsText = this.sMainGroupElement.append("text");
            this.sLinePath = this.sMainGroupElement.append("path");
            this.sTopCustomBorder = this.sMainGroupElement.append("rect");
            this.sRightCustomBorder = this.sMainGroupElement.append("rect");
            this.sBottomCustomBorder = this.sMainGroupElement.append("rect");
            this.sLeftCustomBorder = this.sMainGroupElement.append("rect");

            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
        }

        private renderTitle(titleText: string, sW: number, iBox1H: number, textColor: Fill, iSize: number) {
            this.sKPIText
            .attr("x", sW * 0.5)
            .attr("y", iBox1H * 0.75)
            .attr("fill", textColor.solid.color)
            .attr("style", sFontFamilyHeading + "font-size:" + iSize + "px")
            .attr("text-anchor", "middle")
            .text(titleText);

            // Fix text size
            var el = <SVGTextElement> this.sKPIText.node();
            for (var i = 0; i < 20; i++) {
                if (el.getComputedTextLength() > sW * 0.8) {
                    iSize -= iBox1H * 0.04;
                    this.sKPIText.attr("style", sFontFamily + "font-size:" + iSize + "px");
                }
                else {
                    break;
                }
            }
            this.sKPIText.attr("visibility", "visible");
        }

        private renderActualText(text: string, sW: number, iBox1H: number, iBox2H: number, textColor: Fill, iSize2: number) {
            this.sKPIActualText
                .attr("x", sW * 0.5)
                .attr("y", iBox1H + iBox2H * 0.55)
                .attr("fill", textColor.solid.color)
                .attr("style", sFontFamily + "font-weight:bold;font-size:" + iSize2 + "px")
                .attr("text-anchor", "middle")
                .text(text);
   
            // Fix text size
            var el = <SVGTextElement> this.sKPIActualText.node();
            for (var i = 0; i < 20; i++) {
                if (el.getComputedTextLength() > sW * 0.5) {
                    iSize2 -= iBox2H * 0.04;
                    if ( iSize2 < 0) {
                        iSize2 = 0;
                    }
                    this.sKPIActualText.attr("style", sFontFamily + "font-weight:bold;font-size:" + iSize2 + "px")
                }
                else {
                    break;
                }
            }
            this.sKPIActualText.attr("visibility", "visible");
        }

        private renderBorder(sW: number, sH: number) {
            // Custom border
            if (this.borderCurrentSettings.show) {
                this.sTopCustomBorder
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", sW)
                    .attr("height", this.borderCurrentSettings.width)
                    .attr("fill", this.borderCurrentSettings.topColor.solid.color);
                this.sRightCustomBorder
                    .attr("x", sW-this.borderCurrentSettings.width)
                    .attr("y", 0)
                    .attr("width", this.borderCurrentSettings.width)
                    .attr("height", sH)
                    .attr("fill", this.borderCurrentSettings.rightColor.solid.color);
                this.sBottomCustomBorder
                    .attr("x", 0)
                    .attr("y", sH-this.borderCurrentSettings.width)
                    .attr("width", sW)
                    .attr("height", this.borderCurrentSettings.width)
                    .attr("fill", this.borderCurrentSettings.bottomColor.solid.color);
                this.sLeftCustomBorder
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", this.borderCurrentSettings.width)
                    .attr("height", sH)
                    .attr("fill", this.borderCurrentSettings.leftColor.solid.color);

                    // Show or hide each side
                    if (this.borderCurrentSettings.type == 'A' || this.borderCurrentSettings.type == 'TO' || this.borderCurrentSettings.type == 'TB') {
                        this.sTopCustomBorder.attr("visibility", "visible");
                    } else {
                        this.sTopCustomBorder.attr("visibility", "hidden");
                    }
                    if (this.borderCurrentSettings.type == 'A' || this.borderCurrentSettings.type == 'RO' || this.borderCurrentSettings.type == 'LR') {
                        this.sRightCustomBorder.attr("visibility", "visible");
                    } else {
                        this.sRightCustomBorder.attr("visibility", "hidden");
                    }
                    if (this.borderCurrentSettings.type == 'A' || this.borderCurrentSettings.type == 'BO' || this.borderCurrentSettings.type == 'TB') {
                        this.sBottomCustomBorder.attr("visibility", "visible");
                    } else {
                        this.sBottomCustomBorder.attr("visibility", "hidden");
                    }
                    if (this.borderCurrentSettings.type == 'A' || this.borderCurrentSettings.type == 'LO' || this.borderCurrentSettings.type == 'LR') {
                        this.sLeftCustomBorder.attr("visibility", "visible");
                    } else {
                        this.sLeftCustomBorder.attr("visibility", "hidden");
                    }
            } else {
                this.sTopCustomBorder.attr("visibility", "hidden");
                this.sRightCustomBorder.attr("visibility", "hidden");
                this.sBottomCustomBorder.attr("visibility", "hidden");
                this.sLeftCustomBorder.attr("visibility", "hidden");
            }
        }

        public update(options: VisualUpdateOptions) {
            let viewModel: KPIViewModel = visualTransform(options, this.host, this);
            
            let settings = this.kpiCurrentSettings = viewModel.settings;
            let borderSettings = this.borderCurrentSettings = viewModel.borderSettings;
            this.kpiDataPoints = viewModel.dataPoints;
            
            let width = options.viewport.width;
            let height = options.viewport.height;

            var sW = width;
            var sH = height;

            var sL = sH;

            var iBox1H = sH * 0.25;
            var iBox2H = sH * 0.25;
            var iBox3H = sH * 0.5;

            var iSize = iBox1H * 0.7;
            var iSize2 = iBox2H * 0.75;

            var textColor = this.kpiCurrentSettings.kpiColors.colorText;

            var kpiText = this.kpiCurrentSettings.kpi.kpiName;
            if (kpiText.length === 0 && this.kpiActualExists) {
                kpiText = viewModel.categoryDimName;
            }
            
            if (this.kpiDataPoints.length === 0) {
                this.svg.attr("visibility", "hidden");
                this.renderTitle(kpiText, sW, iBox1H, textColor, iSize)
                this.renderActualText("N/A", sW, iBox1H, iBox2H, this.kpiCurrentSettings.kpiColors.colorNone, iSize2)
                this.renderBorder(sW, sH)
                return;
            }
            this.svg.attr("visibility", "visible");
            this.renderBorder(sW, sH)

            // Limit properties
            this.kpiCurrentSettings.kpiFonts.sizeActual = this.kpiCurrentSettings.kpiFonts.sizeActual > 500 ? 500 : this.kpiCurrentSettings.kpiFonts.sizeActual < 1 ? 1 : this.kpiCurrentSettings.kpiFonts.sizeActual;
            this.kpiCurrentSettings.kpiFonts.sizeDeviation = this.kpiCurrentSettings.kpiFonts.sizeDeviation > 500 ? 500 : this.kpiCurrentSettings.kpiFonts.sizeDeviation < 1 ? 1 : this.kpiCurrentSettings.kpiFonts.sizeDeviation;
            this.kpiCurrentSettings.kpiFonts.sizeHeading = this.kpiCurrentSettings.kpiFonts.sizeHeading > 500 ? 500 : this.kpiCurrentSettings.kpiFonts.sizeHeading < 1 ? 1 : this.kpiCurrentSettings.kpiFonts.sizeHeading;
            this.kpiCurrentSettings.kpi.bandingPercentage = this.kpiCurrentSettings.kpi.bandingPercentage > 500 ? 500 : this.kpiCurrentSettings.kpi.bandingPercentage < -500 ? -500 : this.kpiCurrentSettings.kpi.bandingPercentage;
            if (this.kpiDynamicTargetExists) {
                this.kpiCurrentSettings.kpi.fixedTarget = null;
            }

            // Convert data points to screen 
            var nW = sW * 0.9;
            var nMax;
            if (this.kpiCurrentSettings.kpi.customEndY !== null) {
                nMax = this.kpiCurrentSettings.kpi.customEndY
            } else {
                nMax = Math.max.apply(Math, this.kpiDataPoints.map(function (o) { return o.trendActual; })); // Math.max.apply(Math, historyActualData);
            }
            var nMin;
            if (this.kpiCurrentSettings.kpi.customStartY !== null) {
                nMin = this.kpiCurrentSettings.kpi.customStartY
            } else {
                nMin = Math.min.apply(Math, this.kpiDataPoints.map(function (o) { return o.trendActual; })); //Math.min.apply(Math, historyActualData);
            }
            var nH = sH * 0.32;
            for (var i = 0; i < this.kpiDataPoints.length; i++) {
                let dp: KPIDataPoint = this.kpiDataPoints[i];
                var yPos = nH * (dp.trendActual - nMin) / (nMax - nMin);
                if (isNaN(yPos)) {
                    yPos = 0;
                }
                dp.x = (i * nW / this.kpiDataPoints.length) + (nW / this.kpiDataPoints.length) * 0.5 + (sW - nW) / 2;
                dp.y = sH - yPos - sH * 0.1 - 2;
                dp.h = yPos + 5;
                dp.w = (sW / this.kpiDataPoints.length) * 0.55;
                dp.dataId = (i * nW / this.kpiDataPoints.length) + (nW / this.kpiDataPoints.length) * 0.5 + (sW - nW) / 2 + "_" + (sH - yPos - sH * 0.1 - 2); // This ID identifies the points
            }
            // End conversion

            //var kpiGoal = this.kpiDataPoints[this.kpiDataPoints.length - 1].target;
            //var kpiActual = this.kpiDataPoints[this.kpiDataPoints.length - 1].actual;
            var kpiGoal = this.kpiDataPoints[this.kpiDataPoints.length - 1].targetAggregated;
            var kpiActual = this.kpiDataPoints[this.kpiDataPoints.length - 1].actualAggregated;
            var kpiCount = this.kpiDataPoints[this.kpiDataPoints.length - 1].countAggregated;

            this.svg.attr({
                'height': height,
                'width': width
            });

            var statusColor = this.kpiCurrentSettings.kpiColors.colorNone;
            if (this.kpiCountExists && kpiCount > 0 || (!this.kpiCountExists && this.kpiActualExists)) {
                statusColor = GetStatusColor(kpiActual, kpiGoal, this.kpiCurrentSettings.kpi.bandingType, this.kpiCurrentSettings.kpi.bandingCompareType, this.kpiCurrentSettings.kpi.bandingPercentage/100.0, this);
            }

            this.sMainRect
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", sW)
                .attr("height", sH)
                .attr("fill", "transparent");

            this.renderTitle(kpiText, sW, iBox1H, textColor, iSize)

            // Get metadata for formatting
            let mdCol = this.getMetaDataColumn(options.dataViews[0]);
            var format = mdCol.format;
            if ( this.kpiCurrentSettings.kpi.customFormat !== null && this.kpiCurrentSettings.kpi.customFormat !== undefined && this.kpiCurrentSettings.kpi.customFormat.length > 0) {
                format = this.kpiCurrentSettings.kpi.customFormat;
            }

            // Actual text
            //var formattedActualValue = formattingService.formatValue(kpiActual, mdCol.format); 
            var formattedActualValue = valueFormatter.format(kpiActual, format); 
            if (this.kpiCurrentSettings.kpi.forceThousandSeparator) {
                formattedActualValue = Math.round(kpiActual).toLocaleString();
            }

            this.renderActualText(formattedActualValue, sW, iBox1H, iBox2H, statusColor, iSize2)

            var el = <SVGTextElement> this.sKPIActualText.node();
            var KPIActualTextWidth = el.getComputedTextLength();

            var diffText = "";
            if (this.kpiTargetExists) {
                diffText = "(" + GetKPIActualDiffFromGoal(kpiActual, kpiGoal, this.kpiCurrentSettings.kpi.bandingCompareType, this.kpiCurrentSettings.kpi.indicateDifferenceAsPercent) + ")";
            }
            this.sKPIActualDiffText
            //.attr("x", sW * 0.95)
                .attr("x", sW * 0.52 + KPIActualTextWidth * 0.5)
                .attr("y", iBox1H + iBox2H * 0.8 - iSize2 * 0.03)
                .attr("fill", textColor.solid.color)
                .attr("style", sFontFamily + "font-weight:bold;font-size:" + iSize2 * 0.5 + "px")
                .attr("text-anchor", "start")
                .text(diffText); 

            // Fix text size
            var diffSize = iBox2H * 0.95;
            var el = <SVGTextElement>this.sKPIActualDiffText.node();
            for (var i = 0; i < 20; i++) {
                var MostRight = (sW * 0.52) + (KPIActualTextWidth * 0.5) + el.getComputedTextLength();
                if (MostRight > (sW * 0.99)) {
                    //iSize2 -= iBox2H * 0.04;
                    var diff = 0.1*(MostRight - (sW * 0.99));
                    if ( diff < 0 ) {
                        diff = 0;
                    }
                    diffSize -= diff;
                    if ( diffSize < 0 ){
                        diffSize = 0;
                    }
                    this.sKPIActualDiffText.attr("style", sFontFamily + "font-weight:bold;font-size:" + diffSize + "px")
                }
                else {
                    break;
                }
            }

            // Deviation visibility
            this.sKPIActualDiffText.attr("visibility", this.kpiCurrentSettings.kpi.displayDeviation ? "" : "hidden");
        
            let kpiHistoryExists:boolean = true;
            if (options.dataViews[0].categorical.categories === undefined) {
                kpiHistoryExists = false;
            }

            var detailsText = this.kpiCurrentSettings.kpi.constantTarget + ": " + valueFormatter.format(kpiGoal, format);
            if (this.kpiCountExists) {
                detailsText += "; " + this.kpiCurrentSettings.kpi.constantCount + ": " + kpiCount;
            }

            this.sKPIDetailsText
            //.attr("x", sW * 0.95)
                .attr("x", sW * 0.5)
                .attr("y", iBox1H + iBox2H)
                .attr("fill", textColor.solid.color)
                .attr("style", sFontFamily + "font-weight:bold;font-size:" + iSize2 * 0.4 + "px")
                .attr("text-anchor", "start")
                .text(detailsText);

            this.sKPIDetailsText.attr("visibility", this.kpiCurrentSettings.kpi.displayDetails ? "" : "hidden");
    
            // Font size (manual)
            if (this.kpiCurrentSettings.kpiFonts.show) {
                this.sKPIText.attr("style", sFontFamily + "font-size:" + this.kpiCurrentSettings.kpiFonts.sizeHeading + "px");
                this.sKPIActualText.attr("style", sFontFamily + "font-weight:bold;font-size:" + this.kpiCurrentSettings.kpiFonts.sizeActual + "px")
                this.sKPIActualDiffText.attr("style", sFontFamily + "font-weight:bold;font-size:" + this.kpiCurrentSettings.kpiFonts.sizeDeviation + "px")
                this.sKPIDetailsText.attr("style", sFontFamily + "font-weight:bold;font-size:" + this.kpiCurrentSettings.kpiFonts.sizeDetails + "px")
            }

            var el = <SVGTextElement>this.sKPIDetailsText.node();
            this.sKPIDetailsText.attr("x", sW * 0.5 - el.getComputedTextLength()/2)

            var shouldDisplayTrend = !isNaN(this.kpiCurrentSettings.kpi.minimumDataPointsForTrendToBeShown) && this.kpiDataPoints.length >= this.kpiCurrentSettings.kpi.minimumDataPointsForTrendToBeShown;
            if ( this.kpiCurrentSettings.kpi.chartType === "LINE" || this.kpiCurrentSettings.kpi.chartType === "LINENOMARKER") {
                // Line chart
                var lineFunction = d3.svg.line()
                    .x(function (d: any) { return d.x; })
                    .y(function (d: any) { return d.y; })
                    .interpolate("linear");

                this.sLinePath
                    .attr("stroke", statusColor.solid.color)
                    .attr("stroke-width", sH * 0.015)
                    .attr("fill", "none")
                    .attr("stroke-linejoin", "round");

                this.sLinePath.attr("d", lineFunction(<any>this.kpiDataPoints));

                var selectionCircle = this.sMainGroupElement2.selectAll("circle").data(this.kpiDataPoints, function (d) { return d.dataId; });

                //Handling new data
                selectionCircle.enter()
                    .append("circle")
                    .classed(".circle112", true)
                    .attr("cx", function (d) { return d.x; })
                    .attr("cy", function (d) { return d.y; })
                    .attr("r", sH * 0.02)
                    .attr("id", function (d) { return d.dataId; })
                    .attr("fill", statusColor.solid.color)
                    .attr("stroke", statusColor.solid.color)
                    .attr("stroke-width", sH * 0.015);

                selectionCircle.exit().remove();

                //Handling change to Target only, with same data
                selectionCircle
                    .attr("fill", statusColor.solid.color)
                    .attr("stroke", statusColor.solid.color);

                this.sLinePath.attr("visibility", "visible");
                this.sMainGroupElement2.selectAll("rect").remove();
                if (!kpiHistoryExists) {
                    selectionCircle.attr("visibility", "hidden");
                }

                if ( this.kpiCurrentSettings.kpi.chartType === "LINENOMARKER" ) {
                    selectionCircle.attr("visibility", "hidden");
                } else {
                    selectionCircle.attr("visibility", "");
                }
                

                this.tooltipServiceWrapper.addTooltip(<any>selectionCircle,
                    (tooltipEvent: TooltipEventArgs<any>) => this.getTooltipData(tooltipEvent.data),
                    (tooltipEvent: TooltipEventArgs<number>) => null); 

                if ( !shouldDisplayTrend ) {
                    selectionCircle.attr("visibility", "hidden");
                    this.sLinePath.attr("visibility", "hidden");
                }
            }
            else if ( this.kpiCurrentSettings.kpi.chartType === "BAR") {
                // Bar chart
                var selectionBar = this.sMainGroupElement2.selectAll("rect").data(this.kpiDataPoints, function (d) { return d.dataId; });

                selectionBar.enter().append("rect")
                    .attr("x", function (d) { return d.x - d.w * 0.5; })
                    .attr("y", function (d) { return d.y; })
                    .attr("width", function (d) { return d.w; })
                    .attr("height", function (d) { return d.h; })
                    .attr("fill", statusColor.solid.color);

                selectionBar.exit().remove();

                selectionBar.attr("fill", statusColor.solid.color);

                this.sMainGroupElement2.selectAll("circle").remove();
                this.sLinePath.attr("visibility", "hidden");
                if (this.kpiDataPoints.length <= 1) {
                    selectionBar.attr("visibility", "hidden");
                }

                this.tooltipServiceWrapper.addTooltip(<any>selectionBar,
                    (tooltipEvent: TooltipEventArgs<any>) => this.getTooltipData(tooltipEvent.data),
                    (tooltipEvent: TooltipEventArgs<number>) => null); 

                if ( !shouldDisplayTrend ) {
                    selectionBar.attr("visibility", "hidden");
                }
            }
        }

        public getMetaDataColumn(dataView: DataView) {
            var retValue = null;
            if (dataView && dataView.metadata && dataView.metadata.columns) {
                for (var i = 0, ilen = dataView.metadata.columns.length; i < ilen; i++) {
                    var column = dataView.metadata.columns[i];
                    if (column.isMeasure) {
                        retValue = column;
                        if ((<any>column.roles).Values === true) {
                            break;
                        }
                    }
                }
            }
            return retValue;
        }

        
        // Right settings panel
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            if( typeof this.kpiCurrentSettings.kpi === 'undefined' ) {
                return objectEnumeration;
            }               

            switch (objectName) {
                case 'kpiFonts':
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: "KPI Fonts",
                        properties: {
                            show: this.kpiCurrentSettings.kpiFonts.show,
                            pKPIFontSizeHeading: this.kpiCurrentSettings.kpiFonts.sizeHeading,
                            pKPIFontSizeActual: this.kpiCurrentSettings.kpiFonts.sizeActual,
                            pKPIFontSizeDeviation: this.kpiCurrentSettings.kpiFonts.sizeDeviation,
                            pKPIFontSizeDetails: this.kpiCurrentSettings.kpiFonts.sizeDetails
                        },
                        selector: null
                    });
                    break;

                case 'kpiColors':
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: "KPI Colors",
                        properties: {
                            pKPIColorGood: this.kpiCurrentSettings.kpiColors.colorGood,
                            pKPIColorNeutral: this.kpiCurrentSettings.kpiColors.colorNeutral,
                            pKPIColorBad: this.kpiCurrentSettings.kpiColors.colorBad,
                            pKPIColorNone: this.kpiCurrentSettings.kpiColors.colorNone,
                            pKPIColorText: this.kpiCurrentSettings.kpiColors.colorText
                        },
                        selector: null
                    });
                    break;

                case 'kpi':
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: "KPI",
                        properties: {
                            pKPIName: this.kpiCurrentSettings.kpi.kpiName,
                            pChartType: this.kpiCurrentSettings.kpi.chartType,
                            pBandingPercentage: this.kpiCurrentSettings.kpi.bandingPercentage,
                            pBandingType: this.kpiCurrentSettings.kpi.bandingType,
                            pBandingCompareType: this.kpiCurrentSettings.kpi.bandingCompareType,
                            pIndicateDifferenceAsPercent : this.kpiCurrentSettings.kpi.indicateDifferenceAsPercent,
                            pForceThousandSeparator : this.kpiCurrentSettings.kpi.forceThousandSeparator,
                            pFixedTarget: this.kpiCurrentSettings.kpi.fixedTarget,
                            pDisplayDeviation: this.kpiCurrentSettings.kpi.displayDeviation,
                            pDisplayDetails: this.kpiCurrentSettings.kpi.displayDetails,
                            pConstantActual: this.kpiCurrentSettings.kpi.constantActual,
                            pConstantTarget: this.kpiCurrentSettings.kpi.constantTarget,
                            pConstantCount: this.kpiCurrentSettings.kpi.constantCount,
                            pCustomFormat: this.kpiCurrentSettings.kpi.customFormat,
                            pAggregationType: this.kpiCurrentSettings.kpi.aggregationType,
                            pMinimumDataPointsForTrendToBeShown: this.kpiCurrentSettings.kpi.minimumDataPointsForTrendToBeShown,
                            pCustomStartY: this.kpiCurrentSettings.kpi.customStartY,
                            pCustomEndY: this.kpiCurrentSettings.kpi.customEndY
                        },
                        selector: null
                    });
                    break;

                    case 'customBorder':
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: "Custom Border",
                        properties: {
                            show: this.borderCurrentSettings.show,
                            pColorTopBorder: this.borderCurrentSettings.topColor,
                            pColorRightBorder: this.borderCurrentSettings.rightColor,
                            pColorBottomBorder: this.borderCurrentSettings.bottomColor,
                            pColorLeftBorder: this.borderCurrentSettings.leftColor,
                            pBorderType: this.borderCurrentSettings.type,
                            pBorderWidth: this.borderCurrentSettings.width
                        },
                        selector: null
                    });
                    break;
            };

            return objectEnumeration;
        }

        public destroy(): void {
            //TODO: Perform any cleanup tasks here
        }

        private getTooltipData(value: any): VisualTooltipDataItem[] {
            var retValue = new Array();
            value.tooltipInfo.forEach(function (e) {
                var a = {
                    displayName: e.displayName,
                    value: e.value,
                    color: "",
                    header: ""
                };
                retValue.push(a);
            });
            return retValue;
        }
    }
}