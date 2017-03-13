var powerbi;
(function (powerbi) {
    var extensibility;
    (function (extensibility) {
        var visual;
        (function (visual) {
            var DefaultHandleTouchDelay = 1000;
            function createTooltipServiceWrapper(tooltipService, rootElement, handleTouchDelay) {
                if (handleTouchDelay === void 0) { handleTouchDelay = DefaultHandleTouchDelay; }
                return new TooltipServiceWrapper(tooltipService, rootElement, handleTouchDelay);
            }
            visual.createTooltipServiceWrapper = createTooltipServiceWrapper;
            var TooltipServiceWrapper = (function () {
                function TooltipServiceWrapper(tooltipService, rootElement, handleTouchDelay) {
                    this.visualHostTooltipService = tooltipService;
                    this.handleTouchDelay = handleTouchDelay;
                    this.rootElement = rootElement;
                }
                TooltipServiceWrapper.prototype.addTooltip = function (selection, getTooltipInfoDelegate, getDataPointIdentity, reloadTooltipDataOnMouseMove) {
                    var _this = this;
                    if (!selection || !this.visualHostTooltipService.enabled()) {
                        return;
                    }
                    var rootNode = this.rootElement;
                    // Mouse events
                    selection.on("mouseover.tooltip", function () {
                        // Ignore mouseover while handling touch events
                        if (!_this.canDisplayTooltip(d3.event))
                            return;
                        var tooltipEventArgs = _this.makeTooltipEventArgs(rootNode, true, false);
                        if (!tooltipEventArgs)
                            return;
                        var tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                        if (tooltipInfo == null)
                            return;
                        var selectionId = getDataPointIdentity(tooltipEventArgs);
                        _this.visualHostTooltipService.show({
                            coordinates: tooltipEventArgs.coordinates,
                            isTouchEvent: false,
                            dataItems: tooltipInfo,
                            identities: selectionId ? [selectionId] : [],
                        });
                    });
                    selection.on("mouseout.tooltip", function () {
                        _this.visualHostTooltipService.hide({
                            isTouchEvent: false,
                            immediately: false,
                        });
                    });
                    selection.on("mousemove.tooltip", function () {
                        // Ignore mousemove while handling touch events
                        if (!_this.canDisplayTooltip(d3.event))
                            return;
                        var tooltipEventArgs = _this.makeTooltipEventArgs(rootNode, true, false);
                        if (!tooltipEventArgs)
                            return;
                        var tooltipInfo;
                        if (reloadTooltipDataOnMouseMove) {
                            tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                            if (tooltipInfo == null)
                                return;
                        }
                        var selectionId = getDataPointIdentity(tooltipEventArgs);
                        _this.visualHostTooltipService.move({
                            coordinates: tooltipEventArgs.coordinates,
                            isTouchEvent: false,
                            dataItems: tooltipInfo,
                            identities: selectionId ? [selectionId] : [],
                        });
                    });
                    // --- Touch events ---
                    var touchStartEventName = TooltipServiceWrapper.touchStartEventName();
                    var touchEndEventName = TooltipServiceWrapper.touchEndEventName();
                    var isPointerEvent = TooltipServiceWrapper.usePointerEvents();
                    selection.on(touchStartEventName + '.tooltip', function () {
                        _this.visualHostTooltipService.hide({
                            isTouchEvent: true,
                            immediately: true,
                        });
                        var tooltipEventArgs = _this.makeTooltipEventArgs(rootNode, isPointerEvent, true);
                        if (!tooltipEventArgs)
                            return;
                        var tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                        var selectionId = getDataPointIdentity(tooltipEventArgs);
                        _this.visualHostTooltipService.show({
                            coordinates: tooltipEventArgs.coordinates,
                            isTouchEvent: true,
                            dataItems: tooltipInfo,
                            identities: selectionId ? [selectionId] : [],
                        });
                    });
                    selection.on(touchEndEventName + '.tooltip', function () {
                        _this.visualHostTooltipService.hide({
                            isTouchEvent: true,
                            immediately: false,
                        });
                        if (_this.handleTouchTimeoutId)
                            clearTimeout(_this.handleTouchTimeoutId);
                        // At the end of touch action, set a timeout that will let us ignore the incoming mouse events for a small amount of time
                        // TODO: any better way to do this?
                        _this.handleTouchTimeoutId = setTimeout(function () {
                            _this.handleTouchTimeoutId = undefined;
                        }, _this.handleTouchDelay);
                    });
                };
                TooltipServiceWrapper.prototype.hide = function () {
                    this.visualHostTooltipService.hide({ immediately: true, isTouchEvent: false });
                };
                TooltipServiceWrapper.prototype.makeTooltipEventArgs = function (rootNode, isPointerEvent, isTouchEvent) {
                    var target = d3.event.target;
                    var data = d3.select(target).datum();
                    var mouseCoordinates = this.getCoordinates(rootNode, isPointerEvent);
                    var elementCoordinates = this.getCoordinates(target, isPointerEvent);
                    var tooltipEventArgs = {
                        data: data,
                        coordinates: mouseCoordinates,
                        elementCoordinates: elementCoordinates,
                        context: target,
                        isTouchEvent: isTouchEvent
                    };
                    return tooltipEventArgs;
                };
                TooltipServiceWrapper.prototype.canDisplayTooltip = function (d3Event) {
                    var canDisplay = true;
                    var mouseEvent = d3Event;
                    if (mouseEvent.buttons !== undefined) {
                        // Check mouse buttons state
                        var hasMouseButtonPressed = mouseEvent.buttons !== 0;
                        canDisplay = !hasMouseButtonPressed;
                    }
                    // Make sure we are not ignoring mouse events immediately after touch end.
                    canDisplay = canDisplay && (this.handleTouchTimeoutId == null);
                    return canDisplay;
                };
                TooltipServiceWrapper.prototype.getCoordinates = function (rootNode, isPointerEvent) {
                    var coordinates;
                    if (isPointerEvent) {
                        // DO NOT USE - WebKit bug in getScreenCTM with nested SVG results in slight negative coordinate shift
                        // Also, IE will incorporate transform scale but WebKit does not, forcing us to detect browser and adjust appropriately.
                        // Just use non-scaled coordinates for all browsers, and adjust for the transform scale later (see lineChart.findIndex)
                        //coordinates = d3.mouse(rootNode);
                        // copied from d3_eventSource (which is not exposed)
                        var e = d3.event, s = void 0;
                        while (s = e.sourceEvent)
                            e = s;
                        var rect = rootNode.getBoundingClientRect();
                        coordinates = [e.clientX - rect.left - rootNode.clientLeft, e.clientY - rect.top - rootNode.clientTop];
                    }
                    else {
                        var touchCoordinates = d3.touches(rootNode);
                        if (touchCoordinates && touchCoordinates.length > 0) {
                            coordinates = touchCoordinates[0];
                        }
                    }
                    return coordinates;
                };
                TooltipServiceWrapper.touchStartEventName = function () {
                    var eventName = "touchstart";
                    if (window["PointerEvent"]) {
                        // IE11
                        eventName = "pointerdown";
                    }
                    return eventName;
                };
                TooltipServiceWrapper.touchMoveEventName = function () {
                    var eventName = "touchmove";
                    if (window["PointerEvent"]) {
                        // IE11
                        eventName = "pointermove";
                    }
                    return eventName;
                };
                TooltipServiceWrapper.touchEndEventName = function () {
                    var eventName = "touchend";
                    if (window["PointerEvent"]) {
                        // IE11
                        eventName = "pointerup";
                    }
                    return eventName;
                };
                TooltipServiceWrapper.usePointerEvents = function () {
                    var eventName = TooltipServiceWrapper.touchStartEventName();
                    return eventName === "pointerdown" || eventName === "MSPointerDown";
                };
                return TooltipServiceWrapper;
            }());
        })(visual = extensibility.visual || (extensibility.visual = {}));
    })(extensibility = powerbi.extensibility || (powerbi.extensibility = {}));
})(powerbi || (powerbi = {}));
