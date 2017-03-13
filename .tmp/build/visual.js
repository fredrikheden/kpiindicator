var powerbi;
(function (powerbi) {
    powerbi.common;
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            ;
            ;
            var StatusColor = { RED: "#DC0002", YELLOW: "#F6C000", GREEN: "#96C401" };
            function GetStatusColor(dActual, dGoal, oBandingType, oBandingCompareType, dPercentBanding) {
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
                if (dActual > dGoal) {
                    retValue += "+";
                }
                var PercMulti = 10;
                var PercSign = "";
                if (bDisplayDiffAsPercent) {
                    PercMulti = 1000;
                    PercSign = " %";
                }
                if (oBandingCompareType === "REL") {
                    retValue += Math.round(PercMulti * (dActual - dGoal) / dGoal) / 10 + PercSign;
                }
                else if (oBandingCompareType === "ABS") {
                    retValue += Math.round(PercMulti * (dActual - dGoal)) / 10 + PercSign;
                }
                return retValue;
            }
            function visualTransform(options, host, thisRef) {
                var dataViews = options.dataViews;
                var defaultSettings = {
                    kpi: {
                        kpiName: "",
                        bandingPercentage: 5,
                        bandingType: "IIB",
                        bandingCompareType: "REL",
                        indicateDifferenceAsPercent: true,
                        chartType: "LINE",
                        forceThousandSeparator: false,
                        fixedTarget: null,
                        grandTotal: false
                    }
                };
                var viewModel = {
                    dataPoints: [],
                    settings: {},
                    categoryDimName: ""
                };
                if (!dataViews
                    || !dataViews[0]
                    || !dataViews[0].categorical
                    || !dataViews[0].categorical.categories
                    || !dataViews[0].categorical.categories[0].source
                    || !dataViews[0].categorical.values)
                    return viewModel;
                var objects = dataViews[0].metadata.objects;
                var kpiSettings = {
                    kpi: {
                        kpiName: visual.getValue(objects, 'kpi', 'pKPIName', defaultSettings.kpi.kpiName),
                        bandingPercentage: visual.getValue(objects, 'kpi', 'pBandingPercentage', defaultSettings.kpi.bandingPercentage),
                        bandingType: visual.getValue(objects, 'kpi', 'pBandingType', defaultSettings.kpi.bandingType),
                        bandingCompareType: visual.getValue(objects, 'kpi', 'pBandingCompareType', defaultSettings.kpi.bandingCompareType),
                        indicateDifferenceAsPercent: visual.getValue(objects, 'kpi', 'pIndicateDifferenceAsPercent', defaultSettings.kpi.indicateDifferenceAsPercent),
                        chartType: visual.getValue(objects, 'kpi', 'pChartType', defaultSettings.kpi.chartType),
                        forceThousandSeparator: visual.getValue(objects, 'kpi', 'pForceThousandSeparator', defaultSettings.kpi.forceThousandSeparator),
                        fixedTarget: visual.getValue(objects, 'kpi', 'pFixedTarget', defaultSettings.kpi.fixedTarget),
                        grandTotal: visual.getValue(objects, 'kpi', 'pGrandTotal', defaultSettings.kpi.grandTotal),
                    }
                };
                var categorical = dataViews[0].categorical;
                var category = categorical.categories[0];
                var dataValue = categorical.values[0];
                var ActualsIndex = -1;
                var TargetsIndex = -1;
                if (categorical.values.length > 0) {
                    if (categorical.values[0].source.roles["Values"] === true)
                        ActualsIndex = 0;
                    if (categorical.values[0].source.roles["Targets"] === true)
                        TargetsIndex = 0;
                }
                if (categorical.values.length > 1) {
                    if (categorical.values[1].source.roles["Values"] === true)
                        ActualsIndex = 1;
                    if (categorical.values[1].source.roles["Targets"] === true)
                        TargetsIndex = 1;
                }
                thisRef.kpiTargetExists = TargetsIndex === -1 ? false : true;
                thisRef.kpiActualExists = ActualsIndex === -1 ? false : true;
                var kpiDataPoints = [];
                for (var i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
                    kpiDataPoints.push({
                        index: i,
                        actual: ActualsIndex === -1 ? null : dataValue.values[ActualsIndex],
                        target: TargetsIndex === -1 ? null : dataValue.values[TargetsIndex],
                        category: category.values[i],
                        x: null,
                        y: null,
                        w: null,
                        h: null,
                        dataId: null
                    });
                }
                return {
                    dataPoints: kpiDataPoints,
                    settings: kpiSettings,
                    categoryDimName: categorical.values[ActualsIndex].source.displayName
                };
            }
            var Visual = (function () {
                function Visual(options) {
                    this.host = options.host;
                    //this.selectionManager = options.host.createSelectionManager();
                    var svg = this.svg = d3.select(options.element)
                        .append('svg')
                        .classed('kpiIndicator', true);
                    this.sMainGroupElement = this.svg.append('g');
                    this.sMainGroupElement2 = this.svg.append('g');
                    this.sMainRect = this.sMainGroupElement.append("rect");
                    this.sKPIText = this.sMainGroupElement.append("text");
                    this.sKPIActualText = this.sMainGroupElement.append("text");
                    this.sKPIActualDiffText = this.sMainGroupElement.append("text");
                    this.sLinePath = this.sMainGroupElement.append("path");
                    this.updateCount = 0;
                }
                Visual.prototype.update = function (options) {
                    var viewModel = visualTransform(options, this.host, this);
                    var settings = this.kpiCurrentSettings = viewModel.settings;
                    this.kpiDataPoints = viewModel.dataPoints;
                    var width = options.viewport.width;
                    var height = options.viewport.height;
                    if (this.kpiDataPoints.length === 0)
                        return;
                    /* Convert data points to screen */
                    var sW = width;
                    var sH = height;
                    var nW = sW * 0.9;
                    var nMax = Math.max.apply(Math, this.kpiDataPoints.map(function (o) { return o.actual; })); // Math.max.apply(Math, historyActualData);
                    var nMin = Math.min.apply(Math, this.kpiDataPoints.map(function (o) { return o.actual; })); //Math.min.apply(Math, historyActualData);
                    var nH = sH * 0.32;
                    for (var i = 0; i < this.kpiDataPoints.length; i++) {
                        var dp = this.kpiDataPoints[i];
                        var yPos = nH * (dp.actual - nMin) / (nMax - nMin);
                        if (isNaN(yPos)) {
                            yPos = 0;
                        }
                        dp.x = (i * nW / this.kpiDataPoints.length) + (nW / this.kpiDataPoints.length) * 0.5 + (sW - nW) / 2;
                        dp.y = sH - yPos - sH * 0.1 - 2;
                        dp.h = yPos + 2;
                        dp.w = (sW / this.kpiDataPoints.length) * 0.55;
                        dp.dataId = (i * nW / this.kpiDataPoints.length) + (nW / this.kpiDataPoints.length) * 0.5 + (sW - nW) / 2 + "_" + (sH - yPos - sH * 0.1 - 2); // This ID identifies the points
                    }
                    /* End conversion */
                    var kpiGoal = this.kpiDataPoints[this.kpiDataPoints.length - 1].target;
                    var kpiActual = this.kpiDataPoints[this.kpiDataPoints.length - 1].actual;
                    var kpiText = this.kpiCurrentSettings.kpi.kpiName;
                    if (kpiText.length === 0 && this.kpiActualExists) {
                        kpiText = viewModel.categoryDimName;
                    }
                    this.svg.attr({
                        'height': height,
                        'width': width
                    });
                    var statusColor = "#999999";
                    if (this.kpiTargetExists) {
                        statusColor = GetStatusColor(kpiActual, kpiGoal, this.kpiCurrentSettings.kpi.bandingType, this.kpiCurrentSettings.kpi.bandingCompareType, this.kpiCurrentSettings.kpi.bandingPercentage);
                    }
                    var sL = sH;
                    var iBox1H = sH * 0.25;
                    var iBox2H = sH * 0.25;
                    var iBox3H = sH * 0.5;
                    this.sMainRect
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", sW)
                        .attr("height", sH)
                        .attr("fill", statusColor);
                    var iSize = iBox1H * 0.7;
                    this.sKPIText
                        .attr("x", sW * 0.5)
                        .attr("y", iBox1H * 0.75)
                        .attr("fill", "white")
                        .attr("style", "font-family:calibri;font-size:" + iSize + "px")
                        .attr("text-anchor", "middle")
                        .text(kpiText);
                    // Fix text size
                    var el = this.sKPIText.node();
                    for (var i = 0; i < 20; i++) {
                        if (el.getComputedTextLength() > sW * 0.8) {
                            iSize -= iBox1H * 0.04;
                            this.sKPIText.attr("style", "font-family:calibri;font-size:" + iSize + "px");
                        }
                        else {
                            break;
                        }
                    }
                    var mdCol = this.getMetaDataColumn(options.dataViews[0]);
                    // Actual text
                    var formattedActualValue = $.formatNumber(kpiActual, { format: mdCol.format, locale: powerbi.common.cultureInfo }); // TODO: Locale
                    var iSize2 = iBox2H * 0.75;
                    this.sKPIActualText
                        .attr("x", sW * 0.5)
                        .attr("y", iBox1H + iBox2H * 0.8)
                        .attr("fill", "white")
                        .attr("style", "font-weight:bold;font-family:calibri;font-size:" + iSize2 + "px")
                        .attr("text-anchor", "middle")
                        .text(formattedActualValue);
                    // Fix text size
                    var el = this.sKPIActualText.node();
                    for (var i = 0; i < 20; i++) {
                        if (el.getComputedTextLength() > sW * 0.5) {
                            iSize2 -= iBox2H * 0.04;
                            this.sKPIActualText.attr("style", "font-weight:bold;font-family:calibri;font-size:" + iSize2 + "px");
                        }
                        else {
                            break;
                        }
                    }
                    var el = this.sKPIActualText.node();
                    var KPIActualTextWidth = el.getComputedTextLength();
                    var diffText = "";
                    if (this.kpiTargetExists) {
                        diffText = "(" + GetKPIActualDiffFromGoal(kpiActual, kpiGoal, this.kpiCurrentSettings.kpi.bandingCompareType, this.kpiCurrentSettings.kpi.indicateDifferenceAsPercent) + ")";
                    }
                    this.sKPIActualDiffText
                        .attr("x", sW * 0.52 + KPIActualTextWidth * 0.5)
                        .attr("y", iBox1H + iBox2H * 0.8 - iSize2 * 0.03)
                        .attr("fill", "white")
                        .attr("style", "font-weight:bold;font-family:calibri;font-size:" + iSize2 * 0.5 + "px")
                        .attr("text-anchor", "start")
                        .text(diffText);
                };
                Visual.prototype.getMetaDataColumn = function (dataView) {
                    var retValue = null;
                    if (dataView && dataView.metadata && dataView.metadata.columns) {
                        for (var i = 0, ilen = dataView.metadata.columns.length; i < ilen; i++) {
                            var column = dataView.metadata.columns[i];
                            if (column.isMeasure) {
                                retValue = column;
                                break;
                            }
                        }
                    }
                    return retValue;
                };
                // Right settings panel
                Visual.prototype.enumerateObjectInstances = function (options) {
                    var objectName = options.objectName;
                    var objectEnumeration = [];
                    switch (objectName) {
                        case 'kpi':
                            objectEnumeration.push({
                                objectName: objectName,
                                displayName: "KPI",
                                properties: {
                                    pKPIName: this.kpiCurrentSettings.kpi.kpiName,
                                    pBandingPercentage: this.kpiCurrentSettings.kpi.bandingPercentage,
                                    pBandingType: this.kpiCurrentSettings.kpi.bandingType,
                                    pBandingCompareType: this.kpiCurrentSettings.kpi.bandingCompareType,
                                    pIndicateDifferenceAsPercent: this.kpiCurrentSettings.kpi.indicateDifferenceAsPercent,
                                    pForceThousandSeparator: this.kpiCurrentSettings.kpi.forceThousandSeparator,
                                    pFixedTarget: this.kpiCurrentSettings.kpi.fixedTarget,
                                    pGrandTotal: this.kpiCurrentSettings.kpi.grandTotal
                                },
                                selector: null
                            });
                            break;
                    }
                    ;
                    return objectEnumeration;
                };
                Visual.prototype.destroy = function () {
                    //TODO: Perform any cleanup tasks here
                };
                return Visual;
            })();
            visual.Visual = Visual;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            /**
             * Gets property value for a particular object.
             *
             * @function
             * @param {DataViewObjects} objects - Map of defined objects.
             * @param {string} objectName       - Name of desired object.
             * @param {string} propertyName     - Name of desired property.
             * @param {T} defaultValue          - Default value of desired property.
             */
            function getValue(objects, objectName, propertyName, defaultValue) {
                if (objects) {
                    var object = objects[objectName];
                    if (object) {
                        var property = object[propertyName];
                        if (property !== undefined) {
                            return property;
                        }
                    }
                }
                return defaultValue;
            }
            visual.getValue = getValue;
            /**
             * Gets property value for a particular object in a category.
             *
             * @function
             * @param {DataViewCategoryColumn} category - List of category objects.
             * @param {number} index                    - Index of category object.
             * @param {string} objectName               - Name of desired object.
             * @param {string} propertyName             - Name of desired property.
             * @param {T} defaultValue                  - Default value of desired property.
             */
            function getCategoricalObjectValue(category, index, objectName, propertyName, defaultValue) {
                var categoryObjects = category.objects;
                if (categoryObjects) {
                    var categoryObject = categoryObjects[index];
                    if (categoryObject) {
                        var object = categoryObject[objectName];
                        if (object) {
                            var property = object[propertyName];
                            if (property !== undefined) {
                                return property;
                            }
                        }
                    }
                }
                return defaultValue;
            }
            visual.getCategoricalObjectValue = getCategoricalObjectValue;
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
//# sourceMappingURL=visual.js.map