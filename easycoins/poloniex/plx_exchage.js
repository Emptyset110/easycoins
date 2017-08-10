
// These vars are passed to JS from PHP
	// var loggedIn = true;
	// var makerFee = 0.0015;
	// var takerFee = 0.0025;

	// These will only be used if the user has no local storage
	// primaryCurrency = 'BTC';
	// secondaryCurrency = 'XMR';
	// currencyPair = 'BTC_XMR';

// *********

if (loggedIn === undefined) { loggedIn = false; }
var marketBTCTable, sellOrdersTable, buyOrdersTable, tradeHistoryTable, myOrdersTable, marketETHTable, marketXMRTable, marketUSDTTable;
var loadCheckInterval;
var initalLoad = true;
var hasHashCurrencyPair = false;
var maxDecimals = 8;
var updateAskSums = false;
var updateBidSums = false;
var defaultOrderbookDisplayLimit = 50;
var orderbookDisplayLimit = defaultOrderbookDisplayLimit;
var lastHeartbeat = Math.floor(Date.now()/1000);
var allBalances;
var privateInfoFetched = false;
var orderBookInitialLoad = 2;

var privateRefreshInterval = 35000;
var candleStickRefreshInterval = 60000;
var depthChartRefreshInterval = 15000;
var reinits = {};
var windowActive = true;
var updatesPaused = false;
var marketEventInProgress = false;
var marketEventQueue = {};
var marketSubscription = null;
var seq = 0;
var liveOrderBooks = true;
var fullOrderBookLoading = false;
var quickOrderBookLoading = false;
var wNonce = 0;
var openOrders = {limit: [],stopLimit: [],loansAvailable: []};
var updateChart = false;
var limitPrecision = false;
var orderBookPrecision = 6;
var orderBookPrecisionIncrement = 1 / Math.pow(10,orderBookPrecision);
var minPrecision = 2;
var showStarOnly = false;

var public_url = 'https://public.poloniex.com';

function trace(s) {
	console.log(s);
}

function doubleToString(product) {
		product = parseFloat(product);
    var productString = product.toFixed(8).toString();
    if (productString.match(/\./)) {
        productString = productString.replace(/\.?0+$/, '');
    }
    return productString;
}


// ----------- local storage ------------------

Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function (key) {
    var value = this.getItem(key);
    try {
        return JSON.parse(value);
    }
    catch(err) {
        console.log("JSON parse failed for lookup of ", key, "\n error was: ", err);
        return null;
    }
};

function saveExchangeSettings(){
	var chartTypeID = $('.candlesticks .chartButtonActive').attr('id');
	if (chartTypeID == undefined) {
		chartTypeID = 1800;
	} else {
		chartTypeID = chartTypeID.substr(11, chartTypeID.length);
	}

	var localEX = localStorage["exchangeSettings"];
	
	if (typeof(localEX) != 'undefined') {
		var oldSettings = JSON.parse(localEX);
	} else {
		var oldSettings = {};
	}

    var settings = {
        currencyPair: currencyPair,
        primaryCurrency: primaryCurrency,
        secondaryCurrency: secondaryCurrency,
        fibLevels: $('#fibCheckbox').is(':checked'),
        sma: $('#smaCheckbox').is(':checked'),
        smaPeriod: $('#smaPeriod').val(),
        ema: $('#emaCheckbox').is(':checked'),
        emaPeriod: $('#emaPeriod').val(),
        ema2: $('#ema2Checkbox').is(':checked'),
        ema2Period: $('#ema2Period').val(),
        bollinger: $('#bollingerCheckbox').is(':checked'),
        chartType: Number(chartTypeID),
        chartLeftPercent: chartLeftPercent,
        chartRightPercent: chartRightPercent,
        chartWidth: chartCanvasWidth,
        throttleToggle: $('#throttleToggle').is(":checked"),
        throttleFreq: $('#throttleFreq').val(),
        groupToggle: $('#groupToggle').is(":checked"),
        groupPoints: $('#groupPoints').val(),
        showStarOnly: $('#marketStar').is(":checked"),
        lendingOrderBooks: $('.mainBox.buyOrders').hasClass('alt'),
        hideDepthChart: $('.marketDepth').hasClass('collapsed')
    };

	var rowSettings = $('#rowButtons .button.active').html();
	var colSettings = $('#colButtons .button.active').attr('data-url');

	if (rowSettings != undefined) {
		settings.marketRows = rowSettings;
	} else {
		if (oldSettings.marketRows != undefined) {
			settings.marketRows = oldSettings.marketRows;
		} else {
			settings.marketRows = '20';
		}
	}
	if (colSettings != undefined) {
		settings.marketCols = colSettings;
	} else {
		if (oldSettings.marketCols != undefined) {
			settings.marketCols = oldSettings.marketCols;
		} else {
			settings.marketCols = 'Name';
		}
	}


  // save all settings to local storage
  localStorage.setItem('exchangeSettings', JSON.stringify(settings));
  //saveTrollboxSettings();
  //console.log("SAVING SETTINGS")
};

var starSettings = [];
function saveNonStarredMarket(dataPair, push){
	if(push) {
		starSettings.push(dataPair);
	} else {
		index = starSettings.indexOf(dataPair);
		if (index > -1) {
		    starSettings.splice(index, 1);
		}
	}
    localStorage.setItem('starSettings', JSON.stringify(starSettings));
    //console.log("SAVING starSettings")
};


function restoreSettingsFromStorage(s) {
	if (s.fibLevels) {
		$('#fibCheckbox').prop('checked', s.fibLevels);
		showFib = s.fibLevels
	}
	if (typeof(s.sma) != 'undefined') {
		$('#smaCheckbox').prop('checked', s.sma);//
		showSma = s.sma;
	}
	if (s.smaPeriod) {
		$('#smaPeriod').val(s.smaPeriod);
		smaPeriod = Number(s.smaPeriod);
	}
	if (typeof(s.ema) != 'undefined') {
		// trace('s.ema is not undefined, =  ' + s.ema);
		$('#emaCheckbox').prop('checked', s.ema);
		showEma = s.ema;
	}
	if (s.emaPeriod) {
		$('#emaPeriod').val(s.emaPeriod);
		emaPeriod = Number(s.emaPeriod);
	}
	if (typeof(s.ema2) != 'undefined') {
		$('#ema2Checkbox').prop('checked', s.ema2);
		showEma2 = s.ema2;
	}
	if (s.ema2Period) {
		$('#ema2Period').val(s.ema2Period);
		ema2Period = Number(s.ema2Period);
	}
	if (typeof(s.bollinger) != 'undefined') { 
		$('#bollingerCheckbox').prop('checked', s.bollinger);
		bollingerBand = s.bollinger;
	}

	if (typeof(s.chartType) != 'undefined') {
		$('.candlesticks .button').find('.active').removeClass('active');
		$('.chartButton' + s.chartType).addClass('active');
		chartType = Number(s.chartType);
	}

	if (typeof(s.chartLeftPercent) != 'undefined') {
		chartLeftPercent = s.chartLeftPercent;
	}
	if (typeof(s.chartRightPercent) != 'undefined') {
		chartRightPercent = s.chartRightPercent;
	}

	if (s.throttleFreq) {
		$('#throttleFreq').val(s.throttleFreq);
		throttleFreq = Number(s.throttleFreq);
	}
	
	if (typeof(s.throttleToggle) != 'undefined') {
		if(s.throttleToggle === true){
			$('#throttleToggle').click();
		}
	}
	
	if (s.groupPoints) {
		$('#groupPoints').val(s.groupPoints);
		groupPoints = Number(s.groupPoints);
	}
	
	if (typeof(s.groupToggle) != 'undefined') {
		if(s.groupToggle === true){
			limitPrecision = true;
			$('#groupToggle').prop('checked', true);
			orderBookPrecision = $('#groupPoints').removeClass("disabled").val();
			orderBookPrecisionIncrement = 1 / Math.pow(10,orderBookPrecision);
		}
	}

	if (typeof(s.showStarOnly) != 'undefined'){
		showStarOnly = s.showStarOnly;
		if (showStarOnly === true) {
			$('#marketStar').prop("checked", true);
		}
		function waitForMarketTables(){
			if(marketTablesLoaded > 3){
				filterNonStarred();
				setTimeout(function(){
					resetMatketTableHeights();
				},250);
			} else {
				setTimeout(function(){
					waitForMarketTables();
				},250);
			}
		}
		waitForMarketTables();
	}
	
	if (typeof(s.lendingOrderBooks) != 'undefined'){
		if (s.lendingOrderBooks === true) {
			$('.mainBox.buyOrders, .mainBox.sellOrders').addClass('alt');
		}
	}

	if (typeof(s.hideDepthChart) != 'undefined'){
		if (s.hideDepthChart === true) {
			$('.marketDepth').addClass('collapsed');
			$('#depthChartInfo').addClass('collapsed');
			$('#depthChartYline').addClass('collapsed');
			$('#depthChartDot').addClass('collapsed');
		}
	}

	// Restore ToolPanel settings
	if (s.marketRows != undefined) {
		$('#rowButtons').find('.show' + s.marketRows).addClass('active');
	} else {
		$('#rowButtons').find('.show20').addClass('active');
	}

	if (s.marketCols != undefined) {
		$('#colButtons').find('[data-url="' + s.marketCols + '"]').addClass('active');
	} else {
		$('#colButtons').find('.showName').addClass('active');
	}


}

function loadExchangeSettings(){
	var settings;
	var localEX = localStorage["exchangeSettings"];
	if(localEX === undefined){
		// if we have no local storage, write the settings for the first time
        saveExchangeSettings();
        localEX = localStorage["exchangeSettings"];
    }
    
	settings = JSON.parse(localEX);

	// Stars
	var localPairs = localStorage["starSettings"];
	if (typeof(localPairs) !== 'undefined') {
		starSettings = JSON.parse(localPairs);
	} else {
		starSettings = [];
	}


    if (hasHashCurrencyPair) {
    	//trace('dont override hash-set currency pair with localStorage');
    } else {
    	// if we have settings grab the currency pair from local storage
    	if(localEX != undefined){
    		if (currencyPairArray.indexOf(settings.currencyPair) != -1) {
		    	currencyPair = settings.currencyPair;
		    	primaryCurrency = settings.primaryCurrency;
		    	secondaryCurrency = settings.secondaryCurrency;
		    }
	    }
    	// Replace the url with the hash
    	window.location.replace((margin ? '/marginTrading' : '/exchange') + '#' + primaryCurrency.toLowerCase() + '_' + secondaryCurrency.toLowerCase());
    }

    restoreSettingsFromStorage(settings);
    //loadTrollboxSettings();
};



function initMarketBox() {
	$('.markets .tools').click(function(){
		if(!$(this).hasClass('active')){
            hideAllToolPanels();
        }
		$(this).parent().find('.toolPanel').fadeToggle(200);
		$(this).addClass('active');
	});
}


function initBigChart() {
	$('.bigChart .tools').click(function(){
		$('.bigChart .toolPanel').fadeToggle();
	});
	$('.group.zoom button').click(function(){
		var id = $(this).attr('id');
		var n = id.substr(4, id.length);
		$(this).parent().parent().find('.chartButtonActive').removeClass('chartButtonActive');
		$(this).addClass('chartButtonActive');
		chartSnapZoom(n);
		saveExchangeSettings();
	});
	$('.group.candlesticks button').click(function(){
		var id = $(this).attr('id');
		var n = id.substr(11, id.length);
		$(this).parent().parent().find('.chartButtonActive').removeClass('chartButtonActive');
		$(this).addClass('chartButtonActive');
		changeChartType(n);
		saveExchangeSettings();
	});
}

function initStopLimits() {
	$('#stopLimitBuy').click(function(){
		$('#stopLimitCommand').val('stopLimitBuy');
	});
	$('#stopLimitSell').click(function(){
		$('#stopLimitCommand').val('stopLimitSell');
	});
}

function initBookControls() {
	// lending orderbooks positions
	$('.switcher').click(function(){
		$('.mainBox.buyOrders, .mainBox.sellOrders').toggleClass('alt');
		saveExchangeSettings();
	});
	
	$('#throttleToggle').click(function() {
		if (this.checked)
			$('#throttleFreq').change();
		else {
			$("#throttleFreq").addClass("disabled");
			setOrderBookUpdateInterval(0);
		}
	});
	
	$("#throttleFreq").change(function(){
		$('#throttleToggle').prop("checked",true);
		$(this).removeClass("disabled");
		setOrderBookUpdateInterval(Number(this.value) * 1000);
	});

	$('#groupToggle').click(function() {
		if (this.checked)
			$('#groupPoints').change();
		else {
			limitPrecision = false;
			$('#groupPoints').addClass("disabled");
			changeOrderBookPrecision(6);
		}
	});
	
	$('#groupPoints').change(function(){
		limitPrecision = true;
		$("#groupToggle").prop("checked",true);
		$(this).removeClass("disabled");
		changeOrderBookPrecision(this.value);
	});
	
	if ($id("throttleToggle").checked)
		$("#throttleFreq").change();
}

function initMarketDepth() {
	$('.marketDepth .head').click(function(){
		$('.marketDepth').toggleClass('collapsed');
		$('#depthChartInfo').toggleClass('collapsed');
		$('#depthChartYline').toggleClass('collapsed');
		$('#depthChartDot').toggleClass('collapsed');
		saveExchangeSettings();
	});
}

function initTradeHistory() {
	$('.tradeHistory button').click(function() {
		$('.tradeHistory button.active').removeClass('active');
		$(this).addClass('active');
		var id = $(this).attr('id');
	});
}


function initNonMarketTables(){
	$(window).resize(function(){
		$('#sellOrderBookTable').DataTable().draw();
		$('#buyOrderBookTable').DataTable().draw();

		$('#tradeHistoryTable').DataTable().draw();
		$('#myOrdersTable').DataTable().draw();
		$('#userTradeHistoryTable').DataTable().draw();
	});
}

function initEscToolpanels() {
	$(document).keyup(function(e) {
		// if (e.keyCode == 13) {  }     // enter
		if (e.keyCode === 27) { hideAllToolPanels(); }   // esc
	});
	var $menu = $('.toolPanel, .tools, .helpPanel, .help'); 
	$(document).on('click', function (e) {
	    // if element is opened and click target is outside it, hide it 
	    if ( !$menu.is(e.target) && !$menu.has(e.target).length) {
	        hideAllToolPanels();
	    }
	});
}

var myTradeHistory = [];
var myTradeHistory_max = 100;
function writeMyTradesTable(d) {

	var pair = currencyPair.split('_');
	if (d === undefined)
		d = myTradeHistory;
	else
		myTradeHistory = d;
	
	var t = '<table id="userTradeHistoryTable">'
	t += '<thead><tr>';
    t += '<th>Date</th>';
	t += '<th>Type</th>';
	t += '<th>Price (' + pair[0] + ')</th>';
	t += '<th>Amount (' + pair[1] + ')</th>';
	t += '<th>Total (' + pair[0] + ')</th>';
	t += '</tr></thead>';
	t += '<tbody>';
	
	var numRows = Math.min(myTradeHistory_max,d.length);
	
	for(var i  = 0; i < numRows; i++) {
		var item = d[i];
		var row = '<tr>';
		var sellClass = 'sellClass';
		var buySell = 'Sell';
		if (item.type === 'buy') {
			sellClass = 'buyClass';
			buySell = 'Buy';
		}
		row += '<td class="date"><span class="year">' + item.date.substring(0, 5) + '</span>' + item.date.substring(5,16) + '<span class="seconds">' + item.date.substring(16) + '</span></td>';
		row += '<td class="type"><span class="' + sellClass + '">' + buySell + '</span></td>';
		row += '<td>' + exactRound(item.rate, maxDecimals) + '</td>';
		row += '<td>' + exactRound(item.amount, maxDecimals) + '</td>';
		row += '<td>' + exactRound(item.total, maxDecimals) + '</td>';
		row += '</tr>';
		t += row;
	}

	t += '</tbody>';
	
	t += '<tbody><tr class="messageTR"><td colspan="5" class="messageTD"><a href="/tradeHistory" class="standard nounderline">Complete Trade History...</a></td></tr></tbody>';

	$('.tradeHistory .data.myTrades').html(t);

	$('#userTradeHistoryTable').dataTable({
	    'paging': false,
	    'autoWidth': true,
	    'info': false,
	    'scrollY': 360,
	    'bSort' : false,
		'language': { "emptyTable": "You have not made any trades yet." },    
	    'fnInitComplete': function() {
	        $('#userTradeHistoryTable_wrapper')
	        .find('.dataTables_scrollBody')
	        .jScrollPane({
	            verticalDragMinHeight: 20
	       });
	    }          
	});
	//redraw the table to account for the scrollbar width
	$('#userTradeHistoryTable').DataTable().draw();
}

function refreshMyTrades() {
	var myTradesURL = '/private?command=returnUserTradeHistoryJSON&currencyPair=' + currencyPair;
    $.getJSON(myTradesURL, function(d) {
    	writeMyTradesTable(d);
    });
}

function writeTradeHistoryTable(d) {

	var pair = currencyPair.split('_');

	var t = '<table id="tradeHistoryTable">'
	t += '<thead><tr>';
    t += '<th>Date</th>';
	t += '<th>Type</th>';
	t += '<th>Price (' + pair[0] + ')</th>';
	t += '<th>Amount (' + pair[1] + ')</th>';
	t += '<th>Total (' + pair[0] + ')</th>';
	t += '</tr></thead>';
	t += '<tbody id="tradeHistoryTableBody">';
	
	var len = (d instanceof Object) ? d.length : 0;

	for(var i  = 0; i < len; i++) {
		var item = d[i];
		var row = '<tr>';
		var sellClass = 'sellClass';
		var buySell = 'Sell';
		if (item.type === 'buy') {
			sellClass = 'buyClass';
			buySell = 'Buy';
		}
		row += '<td class="date"><span class="year">' + item.date.substring(0, 5) + '</span>' + item.date.substring(5,16) + '<span class="seconds">' + item.date.substring(16) + '</span></td>';
		row += '<td class="type"><span class="' + sellClass + '">' + buySell + '</span></td>';
		row += '<td>' + exactRound(item.rate, maxDecimals) + '</td>';
		row += '<td>' + exactRound(item.amount, maxDecimals) + '</td>';
		row += '<td>' + exactRound(item.total, maxDecimals) + '</td>';
		row += '</tr>';
		t += row;
	}

	t += '</tbody>';

	$('.tradeHistory .data.marketTrades').html(t);

	$('#tradeHistoryTable').dataTable({
	    'paging': false,
	    'autoWidth': true,
	    'info': false,
	    'scrollY': 360,
	    'bSort' : false,
		'language': { "emptyTable": "There are no trades." },     
	    'fnInitComplete': function() {
	        $('#tradeHistoryTable_wrapper')
	        .find('.dataTables_scrollBody')
	        .jScrollPane({
	            verticalDragMinHeight: 20
	       });
	    }          
	});
	//redraw the table to account for the scrollbar width
	$('#tradeHistoryTable').DataTable().draw();

}

function refreshTradeHistory(){
    var tradeHistURL = public_url + '?command=returnTradeHistory&currencyPair=' + currencyPair;
    $.getJSON(tradeHistURL, function(d) {
    	writeTradeHistoryTable(d);
    });
}

// Fill buy/sell fields with summed order book amounts
function orderBookClick(side,row){
	var rate = row.cells[0].innerHTML;
	var totalAmount = 0;
	var total = 0;
	if (side == "bids"){
		var targetSide = "sell";
		var otherSide = "buy";
	} else {
		var targetSide = "buy";
		var otherSide = "sell";

	}
	var reversed = false;
	
	var rows = row.parentElement.rows;
	for (var i=(reversed ? rows.length-1 : 0); (reversed ? (i >= row.rowIndex-1) : (i < row.rowIndex)); i += (reversed ? -1 : 1)){
		var amount = parseFloat(rows[i].cells[1].innerHTML);
		totalAmount	+= amount;
		total		+= parseFloat(rows[i].cells[0].innerHTML) * amount;
	}
	
	document.getElementById(targetSide + "Rate").value = rate;
	document.getElementById(targetSide + "Amount").value = totalAmount.toFixed(8);
	document.getElementById(targetSide + "Total").value = total.toFixed(8);
	
	document.getElementById(otherSide + "Rate").value = rate;
	document.getElementById(otherSide + "Amount").value = "";
	document.getElementById(otherSide + "Total").value = "";
}


function loadFullOrderbook(numRows){
	if (typeof numRows == "undefined")
		numRows = 9999999-orderbookDisplayLimit;
	orderBookReady = false;
	$(".messageTD").html('Loading <i class="fa fa-spinner fa-spin"></i>');
	setTimeout(function(){
		orderbookDisplayLimit += numRows;
		writeBuySellOrdersTable('bids', orderbookDisplayLimit);
		writeBuySellOrdersTable('asks', orderbookDisplayLimit);
		orderBookReady = true;
		processMarketQueue();
	},100);
}

function writeBuySellOrdersTable(side, displayLimit){
	if (!displayLimit)
		displayLimit = orderbookDisplayLimit;
	
	var buySell = (side == 'asks' ? 'sell' : 'buy');
	var rates = limitPrecision ? Object.keys(orderBookFixedRates[side]).sort(side == "asks" ? asc : desc) : orderBookRates[side];
	
	var t = '<table id="' + buySell + 'OrderBookTable">';
	t += '<thead><tr>';
	t += '<th>Price</th>';
	t += '<th>' + secondaryCurrency+ '</th>';
	t += '<th>' + primaryCurrency + '</th>';
	t += '<th>Sum(' + primaryCurrency + ')</th>';
	t += '</tr></thead>';
	t += '<tbody id="' + side + 'TableBody">';
	
	for (var i in rates){
		if (i > displayLimit)
			break;
		
		var order = limitPrecision ? sumOrderRow(side,rates[i]) : orderBookCache[side][rates[i]]
		t += orderBookRow(order,side); 
	}

	t += '</tbody>';
	
	// Add the load full orderbook button if needed
	if (rates.length>displayLimit){
		var linkText = '<tbody><tr class="messageTR" id="' + side + 'LoadAll"><td></td><td></td><td></td><td class="messageTD"><a class="standard nounderline" onclick="loadFullOrderbook(100);" href="javascript:void(0);">Load 100 More<i class="fa fa-sort-amount-asc"></i></a></td></tr></tbody>';
		t += linkText;
	}

	

	var div = $('.' + buySell + 'Orders');
	div.find('.data').html(t);
	$("#" + side + "TableBody tr").click(function(){orderBookClick(side,this)});

	// set currencies, totals, highest bid / lowest ask
	// But only if the table is not empty, otherwise it'll fail
	if(rates.length > 0){
		var cur = div.find('.details .currency');
		var topOrder = exactRound(rates[0], maxDecimals);
		if (buySell === 'buy') {
			cur.html(primaryCurrency);
			document.getElementById("highestBid").innerHTML = topOrder;
			if (orderBookInitialLoad>0)
				document.getElementById("sellRate").value = topOrder;
		} else {
			cur.html(secondaryCurrency);
			document.getElementById("lowestAsk").innerHTML = topOrder;
			if (orderBookInitialLoad>0)
				document.getElementById("buyRate").value = topOrder;
		}
	}
	orderBookInitialLoad -= 1;

	// set total at top
	document.getElementById(side + "Total").innerHTML = orderBookTotals[side].toFixed(8);

	// reinit datatables
	var options = {
		'paging': false,
		'autoWidth': true,
		'info': false,
		'scrollY': 360,
		'bSort': false,
		'language': { "emptyTable": "No orders to display." }
    	
	};
	$('#' + buySell + 'OrderBookTable').dataTable(options);

	// reinit jscrollpane
	$('#' + buySell + 'OrderBookTable_wrapper .dataTables_scrollBody').jScrollPane({
	            verticalDragMinHeight: 20
	       }); 

	//redraw the table to account for the scrollbar width
	$('#' + buySell + 'OrderBookTable').DataTable().draw();
	
	setTimeout(function(){
		updateTotals(side,-1,true);
	},0);
}

function reinitOrderbookPane(buySell){
	reinits['#' + buySell + 'OrderBookTable_wrapper .dataTables_scrollBody'] = true;
}

function executeReinits(){
	if (updatesPaused)
		return;
	for (pane in reinits){
		if (reinits[pane])$(pane).data('jsp').reinitialise();
		reinits[pane] = false;
	}
}

function refreshDepthChart(){
	if (updatesPaused)
		return;
	
	if (!orderBookReady)
		return setTimeout(function(){refreshDepthChart();}, 1000);
	
	var cw = getChartWidth();
	$('#depthCanvas').attr({height: 200 * window.devicePixelRatio, width: cw * window.devicePixelRatio}).css({width: cw});
	
	// Reformat the orderbook cache
	var formattedOrderBook = {"asks": [], "bids": []};
	
	for (var side in orderBookRates)
		for (var i in orderBookRates[side])
			formattedOrderBook[side][i] = [parseFloat(orderBookRates[side][i]),parseFloat(orderBookCache[side][orderBookRates[side][i]].amount)];
	
	// Draw the depth chart
	depthDetectArrays = depthChart("depthCanvas", formattedOrderBook, dark);
}

function refreshOrderBook_br(){
	var url = public_url + '?command=returnOrderBook&depth=9999999&currencyPair=' + currencyPair;
    
	resetOrderBookCache();
	
    $.getJSON(url, function(d) {
	    delete d.isFrozen;
	    seq = parseInt(d.seq);
	    delete d.seq;
	    
	    for (var side in d)
	    	for (var i in d[side])
				cacheOrder(d[side][i],side,false,i);

    	writeBuySellOrdersTable('bids');
		writeBuySellOrdersTable('asks');
		
		for (var i in marketEventQueue)
			if (parseInt(i) <= seq)
				delete marketEventQueue[i];
		
		orderBookReady = true;
		setBookUIstate();
		processMarketQueue();
		
		refreshDepthChart();
    });
}

function refreshOrderBook_quick(){
	var url = public_url + '?command=returnOrderBook&depth=' + orderbookDisplayLimit + '&currencyPair=' + currencyPair;
    
    resetOrderBookCache();
	
    $.getJSON(url, function(d) {
	    delete d.isFrozen;
	    delete d.seq;
	    
	    for (var side in d)
	    	for (var i in d[side])
				if (!fullOrderBookLoading && !orderBookReady)
					cacheOrder(d[side][i],side,false,i);
		
		quickOrderBookLoading = true;
		if (!fullOrderBookLoading && !orderBookReady){
			writeBuySellOrdersTable('bids');
			writeBuySellOrdersTable('asks');
		}
		
		quickOrderBookLoading = false;
	});
}


function init3ColActions() {
	$(function () {
	    $("#stopLimitTotal").on("keyup", function () {
	        var product = document.getElementById('stopLimitTotal').value / document.getElementById('stopLimitRate').value;
	        var productString = product.toFixed(8).toString();
	        if (productString.match(/\./)) {
	            productString = productString.replace(/\.?0+$/, '');
	        }
	        document.getElementById('stopLimitAmount').value = productString;

	    });
	});

	$(function () {
	    $("#buyTotal").on("keyup", function () {
	        var product = Math.floor((document.getElementById('buyTotal').value / document.getElementById('buyRate').value)*100000000)/100000000;
	        var productString = product.toFixed(8).toString();
	        if (productString.match(/\./)) {
	            productString = productString.replace(/\.?0+$/, '');
	        }
	        document.getElementById('buyAmount').value = productString;
	    });
	});

	$(function () {
	    $("#sellTotal").on("keyup", function () {
	        var product = Math.floor((document.getElementById('sellTotal').value / document.getElementById('sellRate').value)*100000000)/100000000;
	        var productString = product.toFixed(8).toString();
	        if (productString.match(/\./)) {
	            productString = productString.replace(/\.?0+$/, '');
	        }
	        document.getElementById('sellAmount').value = productString;
	    });
	});

	$(function () {
	    $("#buyAmount").on("keyup", function () {
	        updateBuyTotal();
	    });
	});

	$(function () {
	    $("#buyRate").on("keyup", function () {
	        updateBuyTotal();
	    });
	});


	$(function () {
	    $("#sellAmount").on("keyup", function () {
	        updateSellTotal();
	    });
	});

	$(function () {
	    $("#sellRate").on("keyup", function () {
	        updateSellTotal();
	    });
	});

	$(function () {
	    $("#stopLimitAmount").on("keyup", function () {
	        updateStopLimitTotal();
	    });
	});

	$(function () {
	    $("#stopLimitRate").on("keyup", function () {
	        updateStopLimitTotal();
	    });
	});

	$(function () {
	    $("#highestBid").click(function (e) {
	        e.preventDefault(); // if desired...
	        document.getElementById('sellRate').value = $("#highestBid").text();
	        updateSellTotal();
	    });
	});

	$(function () {
	    $("#lowestAsk").click(function (e) {
	        e.preventDefault(); // if desired...
	        document.getElementById('buyRate').value = $("#lowestAsk").text();
	        updateBuyTotal();
	    });
	});


	$(function () {
	    $("#stopLimitSecondaryBalance").click(function (e) {
	        e.preventDefault();
	        document.getElementById('stopLimitAmount').value = $("#stopLimitSecondaryBalance").text();
	        updateSellTotal();
	    });
	});

	$(function () {
	    $("#stopLimitPrimaryBalance").click(function (e) {
	        e.preventDefault();
	        var product = $("#stopLimitPrimaryBalance").text() / document.getElementById('stopLimitRate').value;
	        var productString = product.toFixed(8).toString();
	        if (productString.match(/\./)) {
	            productString = productString.replace(/\.?0+$/, '');
	        }
	        document.getElementById('stopLimitAmount').value = productString;
	        document.getElementById('stopLimitTotal').value = $("#stopLimitPrimaryBalance").text();
	        updateBuyTotal();
	    });
	});


	$(function () {
	    $("#secondaryBalance").click(function (e) {
	        e.preventDefault();
	        document.getElementById('sellAmount').value = $("#secondaryBalance").text();
	        updateSellTotal();
	    });
	});

	$(function () {
	    $("#primaryBalance").click(function (e) {
	        e.preventDefault();
	        var product = $("#primaryBalance").text() / document.getElementById('buyRate').value;
	        var productString = product.toFixed(8).toString();
	        if (productString.match(/\./)) {
	            productString = productString.replace(/\.?0+$/, '');
	        }
	        document.getElementById('buyAmount').value = productString;
	        document.getElementById('buyTotal').value = $("#primaryBalance").text();
	        updateBuyTotal();
	    });
	});
}

function updateStopLimitTotal() {
    var product = document.getElementById('stopLimitAmount').value * document.getElementById('stopLimitRate').value;
    var productString = product.toFixed(8).toString();
    if (productString.match(/\./)) {
        productString = productString.replace(/\.?0+$/, '');
    }
    document.getElementById('stopLimitTotal').value = productString;
}

function updateSellTotal() {
    var product = document.getElementById('sellAmount').value * document.getElementById('sellRate').value;
    var productString = product.toFixed(8).toString();
    if (productString.match(/\./)) {
        productString = productString.replace(/\.?0+$/, '');
    }
    document.getElementById('sellTotal').value = productString;
}

function updateBuyTotal() {
    var product = document.getElementById('buyAmount').value * document.getElementById('buyRate').value;
    var productString = product.toFixed(8).toString();
    if (productString.match(/\./)) {
        productString = productString.replace(/\.?0+$/, '');
    }
    document.getElementById('buyTotal').value = productString;
}

function webSocketCall(params,id){
	return false;
	if ('conn' in window && window.conn.readyState == 1 && 1000 in window.conn.subscriptions){
		if (typeof id == "undefined")
			id = ++wNonce + usid;
		window.conn.send(JSON.stringify({command: "private",channel: 2000,id: id,params: params}));
		return true;
	} else {
		return false;
	}
}


function cancelOrder(orderNumber) {    
    $("#cancel-" + orderNumber).html('<span class="fa fa-spinner fa-spin"></span>');
    var params = {command: 'cancelOrder', currencyPair: currencyPair, orderNumber: orderNumber};
    
    if (webSocketCall(params,orderNumber))
    	return;
    
	$.getJSON("/private.php", params,function(data){
		if (data.success == 1)
			$("#myOrdersTable").DataTable().row("#orderRow-" + orderNumber).remove().draw();
	}).always(function(){
		updatePrivateInfo();
	});
}

function cancelTriggerOrder(orderNumber) {
    url = "/private.php";
    var posting = $.get(url, { command: 'cancelTriggerOrder', currencyPair: currencyPair, orderNumber: orderNumber});
    posting.done(function (data) {
        updatePrivateInfo();
    });
}

function myOpenOrdersRow(item){
	var split = item.date.split('-');
	var year = split[0];
	var restOfDate = split[1] + '-' + split[2];
	split = restOfDate.split(':');
	var seconds = split[2];
	restOfDate = split[0] + ':' + split[1];
	
	var row = '<tr id="orderRow-' + item.orderID + '">';
		row += '<td class="type"><span class="' + item.type + 'Class">' + capitalize(item.type) + '</span></td>';
		row += '<td class="rate">' + item.rate + '</td>';
		row += '<td class="amount">' + item.amount + '</td>';
		row += '<td class="total">' + exactRound(item.total, maxDecimals) + '</td>';
		row += '<td>--</td>';
		row += '<td class="date"><span class="year">' + year + '-</span>' + restOfDate + '<span class="seconds">:' + seconds + '</span></td>';
		row += '<td class="action" id="cancel-' + item.orderID + '" style="text-align:center;"><a class="standard nounderline" href="javascript:void(0)" onclick="javascript:cancelOrder('+ item.orderID +');">Cancel</a></td>';
		row += '</tr>';
	
	return row;
}

function writeMyOpenOrdersTable(d) {
	ds = d['stopLimit'];
	loansAvailable = d['loansAvailable'];
	openOrders = d;
	var t = '<table id="myOrdersTable"><thead><tr>';
	t += '<th>Type</th>';
	t += '<th>Price (' + primaryCurrency + ')</th>';
	t += '<th>Amount (' + secondaryCurrency + ')</th>';
	t += '<th>Total (' + primaryCurrency + ')</th>';
	t += '<th>Rate/Stop</th>';
	t += '<th>Date</th>';
	t += '<th>Action</th>';
	t += '</tr></thead>';
	t += '<tbody>';

	for (var i in openOrders.limit)
		t += myOpenOrdersRow(openOrders.limit[i]);
	
	for (var i = 0; i < loansAvailable.length; i++) {
		var item = loansAvailable[i];
		var split = item.date.split('-');
		var year = split[0];
		var restOfDate = split[1] + '-' + split[2];
		split = restOfDate.split(':');
		var seconds = split[2];
		restOfDate = split[0] + ':' + split[1]; 

		var buySell = 'Buy';
		if (item.type === 'sell') { buySell = 'Sell'; }
		var row = '<tr>';
		row += '<td class="type"><span class="' + item.type + 'Class">' + buySell + '</span><span class="description"> (Loans-available)</span></td>';
		row += '<td>' + item.rate + '</td>';
		row += '<td>' + item.amount + '</td>';
		row += '<td>' + exactRound(item.total, maxDecimals) + '</td>';
		row += '<td>' + (parseFloat(item.triggerValue)*100).toFixed(4) + '%</td>';
		row += '<td class="date"><span class="year">' + year + '-</span>' + restOfDate + '<span class="seconds">:' + seconds + '</span></td>';
		row += '<td class="action"><a class="standard nounderline" href="javascript:void(0)" onclick="javascript:cancelTriggerOrder('+ item.orderID +');">Cancel</a></td>';
		row += '</tr>';
		t += row;
	}
	
	for (var i = 0; i < ds.length; i++) {
		var item = ds[i];
		var split = item.date.split('-');
		var year = split[0];
		var restOfDate = split[1] + '-' + split[2];
		split = restOfDate.split(':');
		var seconds = split[2];
		restOfDate = split[0] + ':' + split[1]; 

		var buySell = 'Buy';
		if (item.type === 'sell') { buySell = 'Sell'; }
		var row = '<tr>';
		row += '<td class="type"><span class="' + item.type + 'Class">' + buySell + '</span><span class="description"> (Stop-limit)</span></td>';
		row += '<td>' + item.rate + '</td>';
		row += '<td>' + item.amount + '</td>';
		row += '<td>' + exactRound(item.total, maxDecimals) + '</td>';
		row += '<td>' + item.stop + '</td>';
		row += '<td class="date"><span class="year">' + year + '-</span>' + restOfDate + '<span class="seconds">:' + seconds + '</span></td>';
		row += '<td class="action"><a class="standard nounderline" href="javascript:void(0)" onclick="javascript:cancelTriggerOrder('+ item.orderID +');">Cancel</a></td>';
		row += '</tr>';
		t += row;
	}

	t += '</tbody></table>';

	$('.openOrders .data').html(t);

	$('#myOrdersTable').dataTable({
	    'paging': false,
	    'autoWidth': true,
	    'info': false,
	    'scrollY': 360,
	    'bSort' : false,
	    'scrollCollapse' : true,
		'language': { "emptyTable": "You have no open orders." },     
	    'fnInitComplete': function() {
	        $('#myOrdersTable_wrapper')
	        .find('.dataTables_scrollBody')
	        .jScrollPane({
	            verticalDragMinHeight: 20
	       });
	    }          
	});

	//redraw the table to account for the scrollbar width
	$('#myOrdersTable').DataTable().draw();

}

function initTradeHistoryButtons() {

	$('#userTradeHistoryButton').click(function(){
		$('#marketTradeHistoryButton').removeClass('active');
		$(this).addClass('active');
		$('.tradeHistory .data.myTrades').show();
		$('.tradeHistory .data.marketTrades').hide();
		$('#userTradeHistoryTable').DataTable().draw();
		refreshMyTrades();
	});
	$('#marketTradeHistoryButton').click(function(){
		$('#userTradeHistoryButton').removeClass('active');
		$(this).addClass('active');
		$('.tradeHistory .data.marketTrades').show();
		$('.tradeHistory .data.myTrades').hide();
		$('#tradeHistoryTable').DataTable().draw();
	});
}

function updateTickerBalances (){
	var balance,value,oldBalance,oldValue;
	var zero = 0.0;
	zero = zero.toFixed(4);
	for (var pair in allTickerData){
		var pairArray = pair.split("_"),
    	base = pairArray[0],
    	quote = pairArray[1],
    	lPair = pair.toLowerCase();
    	var row = $('#marketRow' + lPair);
    	var balance = 0.0;
    	var value = 0.0;
    	if (allBalances instanceof Object){
			balance = parseFloat(allBalances['balances'][quote]) + parseFloat(allBalances['onOrders'][quote]);    
			value = balance * parseFloat(allTickerData[pair]['highestBid']);
		}
		balance = balance.toFixed(4);
		value = value.toFixed(4);
		if (isNaN(balance))balance = zero;
		if (isNaN(value))value = zero;
		
		if (!('balance' in allTickerData[pair]))allTickerData[pair]['balance'] = zero;
		if (!('value' in allTickerData[pair]))allTickerData[pair]['value'] = zero;
		oldBalance = allTickerData[pair]['balance'];
		oldValue = allTickerData[pair]['value'];
		
		if (balance != oldBalance | value != oldValue){
			allTickerData[pair]['balance'] = balance;
			allTickerData[pair]['value'] = value;
			var table = $("#market" + base).DataTable();
			var balCell = row.find('.colBalance');
			var valCell = row.find('.colEstVal');
			try {
				table.cell(balCell).data(balance).draw();
				table.cell(valCell).data(value).draw();
			} catch(err) {
				// Still not sure why there are blank cells sometimes...
			}
		}
	}

}

function updatePrivateInfo(){
	var url = '/private?command=returnPrivateInfoJSON&currencyPair=' + currencyPair;
	if (!loggedIn) { privateInfoFetched = true; return; }
	$.getJSON(url, function(d) {
		if (d.error) { 
			loggedIn = false;
			showLogoutWarning(); 
			return; 
  		}
  		
		var primaryBalance = margin ? d.balances.tradable[currencyPair][primaryCurrency] : d.balances.balances[primaryCurrency];
		var secondaryBalance = margin ? d.balances.tradable[currencyPair][secondaryCurrency] : d.balances.balances[secondaryCurrency];
		$('#primaryBalance').html(primaryBalance);
		$('#secondaryBalance').html(secondaryBalance);
		$('#stopLimitPrimaryBalance').html(primaryBalance);
		$('#stopLimitSecondaryBalance').html(secondaryBalance);
		allBalances = d.balances;
		if (privateInfoFetched)updateTickerBalances();
		privateInfoFetched = true;
		var openOrders = d.openOrders;
        writeMyOpenOrdersTable(openOrders);
        
        if (margin){
	        var marginPosition = d.marginPositions[currencyPair];
	        html = "";
			if (marginPosition){
				var position = marginPosition['amount'] < 0 ? '<span class="valueNegative">Short</span>' : '<span class="valuePositive">Long</span>';
				var amount = marginPosition['amount'];
				var liquidationPrice = marginPosition['liquidationPrice'] <= 0 ? "N/A" : marginPosition['liquidationPrice'];
				html += "<table class='orderBook'><tr>";
				html += "<th>Position</th>";
				html += "<th>Amount</th>";
				html += "<th>Base Price</th>";
				html += "<th>Est. Liquidation Price</th>";
				html += "<th>Unrealized P/L</th>";
				html += "<th>Unrealized Lending Fees</th>";
				html += "<th>Action</th>";
				html += "</tr>";
				html += "<tr>";
				html += "<td>" + position + "</td>";
				html += "<td>" + amount + " " + secondaryCurrency + "</td>";
				html += "<td>" + (marginPosition['basePrice'] <= 0 ? "N/A" : marginPosition['basePrice']) + "</td>";
				html += "<td>" + liquidationPrice + "</td>";
				html += "<td><span class=\"value" + (marginPosition['pl'] < 0 ? "Negative" : "Positive") + "\">" + marginPosition['pl'] + " " + primaryCurrency + "</span></td>";
				html += "<td><span class=\"value" + (marginPosition['lendingFees'] < 0 ? "Negative" : "Positive") + "\">" + marginPosition['lendingFees'] + " " + primaryCurrency + "</span></td>";
				html += "<td><a class='standard' href='javascript:void(0)' onclick='closeMarginPosition(\"" + currencyPair + "\")'>Close</a></td>";
				html += "</tr></table>";
			} else {
				html += "<div class='message'><div>To begin margin trading, you must first <a href='javascript:void(0)' onclick='showBalanceTransfer()' class='standard'>transfer balances</a> into your margin account. Once you open a margin position, it will appear here. <span class='help'>Be sure you have read about <a href='/support/aboutMarginTrading/' class='standard'>Margin Trading on Poloniex</a> and understand the risks before opening a position.</span></div></div>";
			}
			$("#marginPosition").html(html);
			
			html = "<tr>";
			html += "<th>Coin</th>";
			html += "<th>Position</th>";
			html += "<th>Amount</th>";
			html += "<th>P/L (BTC)</th>";
			html += "<th>Liq. Price</th>";
			html += "</tr>";
			atLeastOne = false;

			for (marginPair in d.marginPositions){
				if (marginPair.indexOf("_") == -1)
					continue;
				explode = marginPair.split("_");
				coin = explode[1];
				marginBase = explode[0];
				if (d.marginPositions[marginPair]){
					position = d.marginPositions[marginPair]['amount'] < 0 ? '<span class="valueNegative">Short</span>' : '<span class="valuePositive">Long</span>';
					amount = d.marginPositions[marginPair]['amount'];
					pl = (parseFloat(d.marginPositions[marginPair]['pl']) + parseFloat(d.marginPositions[marginPair]['lendingFees'])).toFixed(8);
					pl = "<span class=\"value" + (pl < 0 ? "Negative" : "Positive") + "\">" + pl + "</span>";
					liquidationPrice = d.marginPositions[marginPair]['liquidationPrice'] <= 0 ? "N/A" : d.marginPositions[marginPair]['liquidationPrice'];
				} else {
					continue;
				}
				
				atLeastOne = true;
				marginBalance = d.balances.marginBalances.balances[coin] === undefined ? "-" : d.balances.marginBalances.balances[coin];
				html += "<tr>";
				html += "<td class=\"coin\">" + coin + "</td>";
				html += "<td class=\"position\">" + position + "</td>";
				html += "<td>" + amount + "</td>";
				html += "<td>" + pl + "</td>";
				html += "<td>" + liquidationPrice + "</td>";
				html += "</tr>";
			}
			
			if (!atLeastOne)
				html += "<tr><td class='empty' colspan='5'>You have no open positions.</td></tr>";
			
			$("#positionsSideTable").html(html);
			
			var data = d.balances.marginBalances;
			var plClass = "";
			var feeClass = "";
			if (data['info']['pl']>0)
				plClass="valuePositive";
			if (data['info']['pl']<0)
				plClass="valueNegative";
			if (data['info']['lendingFees']<0)
				feeClass="valueNegative";
			html = '';
/*
			for (currency in data['balances']){
				html += '<tr>';
				html += '<td>' + currency + '</td>';
				html += '<td>' + data['balances'][currency] + '</td>';
				html += '</tr>';
			}
*/
			initialMargin = parseFloat(data['info']['initialMargin']);
			maintenanceMargin = parseFloat(data['info']['maintenanceMargin']);
			currentMargin = parseFloat(data['info']['currentMargin']);
			
			
			warningScale = Math.floor(100 - ((currentMargin - maintenanceMargin) * (100 / (initialMargin - maintenanceMargin))));
			if (warningScale < 0)
				warningScale = 0;
			if (warningScale > 100)
				warningScale = 100;
			
			if (currentMargin >= 1.0){
				currentMargin = '>100';
			} else {
				currentMargin = (currentMargin*100).toFixed(2);
			}
			leverage = (1 / parseFloat(data['info']['initialMargin'])).toFixed(1);
			html += '<tr>';
			html += '<td>Total Margin Value</td>';
			html += '<td>' + data['info']['totalValue'] + ' BTC</td>';
			html += '</tr><tr>';
			html += '<td>Unrealized P/L</td>';
			html += '<td><span class="' + plClass + '">' + data['info']['pl'] + ' BTC</span></td>';
			html += '</tr><tr>';
			html += '<td>Unrealized Lending Fees</td>';
			html += '<td><span class="' + feeClass + '">' + data['info']['lendingFees'] + ' BTC</span></td>';
			html += '</tr><tr>';
			html += '<td>Net Value</td>';
			html += '<td>' + data['info']['netValue'] + ' BTC</td>';
			html += '</tr><tr>';
			html += '<td>Total Borrowed Value</td>';
			html += '<td>' + data['info']['totalBorrowedValue'] + ' BTC</td>';
			html += '</tr><tr>';
			html += '<th colspan="2">Margins (' + leverage + 'x Leverage)</th></tr>';
            html += '<tr id="marginGraphTR">';
            html += '<td colspan="2">';
            html += '<div class="heading">';
            html += '<div class="maint label">Maintenance <strong>' + (maintenanceMargin*100).toFixed(0) + '%</strong></div>';
            html += '<div class="init label">Initial <strong>' + (initialMargin*100).toFixed(0) + '%</strong></div>';
            html += '</div>';
            html += '<div id="marginGraph" class="label">Current Margin - N/A</div>';
            html += '<div class="message">If your Current Margin falls below your Maintenance Margin, your account will be <a href="/support/aboutMarginTrading#forcedLiquidation" class="standard">liquidated</a>.</div>';
            html += '</td>';
            html += '</tr>';
			html += '<tr id="marginCallTR"><td colspan="2"><div class="message"><h3><i class="fa fa-exclamation-triangle"></i> <span class="title">Margin Call</span></h3><div class="description">Your collateral balance is dangerously close to the minimum maintenance margin. To avoid a forced liquidation, <a href="javascript:void(0)" onclick="showBalanceTransfer()">transfer additional collateral</a> to your margin account immediately.</div></div></td></tr>';
			$("#marginBalancesTable").html(html);

			if(parseFloat(data['info']['totalBorrowedValue']) > 0){
				$('#marginGraphTR').addClass('enabled');
				xPosition = (0-warningScale) * 3.54 + 354;
	            $('#marginGraph')
	            	.css('background-position', xPosition + 'px 0')
	            	.html('Current Margin <strong>' + currentMargin + '%');
			}

		}	
		
		if (d.marginPositions.notifications.marginCall == true)
			criticalMessage('margin');
	});
}


function updateMarketDisplay() {
	$.getJSON(tickerAPI_url, function(d) {
		for (pair in d){
			allTickerData[pair]['last'] = d[pair]['last'];
			allTickerData[pair]['lowestAsk'] = d[pair]['lowestAsk'];
			allTickerData[pair]['highestBid'] = d[pair]['highestBid'];
			allTickerData[pair]['percentChange'] = d[pair]['percentChange'];
			allTickerData[pair]['baseVolume'] = d[pair]['baseVolume'];
			allTickerData[pair]['quoteVolume'] = d[pair]['quoteVolume'];
			allTickerData[pair]['isFrozen'] = d[pair]['isFrozen'];
			allTickerData[pair]['high24hr'] = d[pair]['high24hr'];
			allTickerData[pair]['low24hr'] = d[pair]['low24hr'];
		}
		setCurrentMarketRowActive();
		drawFullMarket();
	});
}

function hardRefreshTicker(){
	$.getJSON(tickerAPI_url, function(d) {
		for (pair in d){
			last = d[pair]['last'];
			lowestAsk = d[pair]['lowestAsk'];
			highestBid = d[pair]['highestBid'];
			percentChange = d[pair]['percentChange'];
			baseVolume = d[pair]['baseVolume'];
			quoteVolume = d[pair]['quoteVolume'];
			isFrozen = d[pair]['isFrozen'];
			high24hr = d[pair]['high24hr'];
			low24hr = d[pair]['low24hr'];
			args = [last,lowestAsk,highestBid,percentChange,baseVolume,quoteVolume,isFrozen,high24hr,low24hr];
			tickerEvent(args);
		}
	});
}

function drawFullMarket() {
	var d = getCurrentPairDetails();
	unsubscribeAll();
	orderBookReady = false;
	setBookUIstate();
    document.title = d.last + ' ' + d.pair + ' Market - Poloniex Bitcoin/Digital Asset Exchange';

    var titleString = 'null'; // Shorten the <h1> string if it's getting too long
    if(d.name.length > (margin ? 10 : 17)){
        titleString = d.name;
    } else {
        titleString = d.name + (margin ? ' Margin Trading' : ' Exchange');
    };
    $('.chartTitle .full').html(titleString);
    $('.chartTitle .code').html(d.pair);

	$('.col.buyCol .head .name').html('BUY ' + secondaryCurrency);
	$('.col.buyCol .link').html('<a href=\"/balances#' + primaryCurrency + '\" class=\"standard\">Deposit ' + primaryCurrency + '</a>');
	$('#buyAmount').val('');
	$('#buyTotal').val('');
	$('#buyFee').html('');

	$('#stopLimitStopRate').val('');
	$('#stopLimitRate').val('');
	$('#stopLimitAmount').val('');
	$('#stopLimitTotal').val('');

	$('.col.sellCol .head .name').html('SELL ' + secondaryCurrency);
	$('.col.sellCol .link').html('<a href=\"/balances#' + secondaryCurrency + '\" class=\"standard\">Deposit ' + secondaryCurrency + '</a>');
	$('#sellAmount').val('');
	$('#sellTotal').val('');

	$('.col .primaryCurrency').html(primaryCurrency);
	$('.col .secondaryCurrency').html(secondaryCurrency);

	$('.hilights .lastPrice .info').html(d.last);
    $('.hilights .change .info').html(d.change);
    $('.hilights .change .info').removeClass('neg').addClass(d.chPosNeg);
    $('.hilights .high .info').html(d.high24hr);
    $('.hilights .low .info').html(d.low24hr);
    $('.hilights .volume .name1').html(primaryCurrency);
	$('.hilights .volume .name2').html(secondaryCurrency);
    $('.hilights .volume .info .vol1').html(d.baseVol);
    $('.hilights .volume .info .vol2').html(d.quoteVol);

	$('.group.zoom').find('.chartButtonActive').removeClass('chartButtonActive');

	//Market Specific Alert	
	if(d.p1=='DAO'){
		$('#marketAlert').show().find('.message').html('We have a tool available to <a class="standard" href="/dao">convert your DAO to ETH</a> on the blockchain. The rate of conversion will remain 1 ETH for every 100 DAO.');
	} else if (d.p1 in disabledCurrencies){
		
		if (disabledCurrencies[d.p1].length > 0)
			var disabledNote = disabledCurrencies[d.p1];
		else
			var disabledNote = d.p1 + " is currently under maintenance or experiencing wallet/network issues. Deposits and withdrawals will remain disabled until a solution is found, which may require an update from the " + d.p1 + " team. Any updates must be tested and audited before enabling.";
		
		$('#marketAlert').show().find('.message').html(disabledNote);
	} else if (d.p1 in currencyNotesPermanent){
		$('#marketAlert').show().find('.message').html(currencyNotesPermanent[d.p1]);
	} else {
		$('#marketAlert').hide().find('.message').html('');
	}

	refreshAll();
}

function setBookUIstate() {
	if (orderBookReady){
		$('body').addClass('booksReady');
		$('.cols input, .cols button').prop("disabled", false);
	} else {
		$('body').removeClass('booksReady');
		$('.cols input, .cols button').prop("disabled", true);
	}
}

function refreshAll() {
	resetWebsocket(true);
	refreshCandleSticksFirst();
	refreshTradeHistory();
	refreshMyTrades();
	privateInfoFetched = false;
	updatePrivateInfo();
}

function initClicks() {
	initMarketBox();
	//initTrollBox();
	initBigChart();
	initStopLimits();
	initBookControls();
	initMarketDepth();
	initTradeHistory();
	initEscToolpanels();
	init3ColActions();
	initTradeHistoryButtons();
}

var hashTimer;
function evaluateHash(h) {
	// this should happen with a new currencyPair, clicked from marketTables. BUT it's possible we get an invalid pair. 
	var pair = h.toUpperCase();
	pair = pair.substr(1, pair.length); // trim #

	if (currencyPairArray.indexOf(pair) != -1) {
		// legit
		var arr = pair.split('_');
		currencyPair =  pair;
		primaryCurrency = arr[0];
		secondaryCurrency = arr[1];
		setCurrentMarketRowActive();
		updateSwitchLink();
	    try{
	    	// don't bother if it is the inital load of the page as initMarketTables() will call updateMarketDisplay()
	    	if(!initalLoad) {
	    		// set a timout and wait briefly, just in case the user rapid-fire clicks the back/forward button
		    	hashTimer = setTimeout(function() {
					updateMarketDisplay();
					saveExchangeSettings();
					// log with Google Analytics
					ga('send', 'pageview', {
					  		'page': margin ? 'marginTrading' : 'exchange' + h,
					  		'title': secondaryCurrency + '/' + primaryCurrency + ' - Ajax navigation event'
						});
				}, 450);
	    	} else {
	    		initalLoad = false;
	    	}
	    } catch(e) {}
	}
}

function initHashChanges() {
	var h = window.location.hash;
	var pair = h.toUpperCase();
	pair = pair.substr(1, pair.length); // trim #

	// trace('on load hash is [' + h + ']');
	// set this so we know not to override it with localStorage or default currencyPair
	if (currencyPairArray.indexOf(pair) != -1) {
		hasHashCurrencyPair = true;
	}
	
	evaluateHash(h);

	window.onhashchange = function() {
		// trace("hash changed: " + window.location.hash);
		clearTimeout(hashTimer);
		evaluateHash(window.location.hash);
	};
}

function tickerEvent(args, kwargs) {
    var newTickerData = {
        last: args[1],
        lowestAsk: args[2],
        highestBid: args[3],
        percentChange: args[4],
        baseVolume: args[5],
        quoteVolume: args[6],
        isFrozen: args[7],
        high24hr: args[8],
        low24hr: args[9]
    };
    
    var oldTickerData = (args[0] in allTickerData) ? allTickerData[args[0]] : newTickerData;
	allTickerData[args[0]] = newTickerData;

    var priceChange = '';
    var pairArray = args[0].split("_"),
    	base = pairArray[0],
    	quote = pairArray[1];
   	var pair = args[0].toLowerCase();
    var row = $("#marketRow" + pair);
    if (row.length == 0)
    	return;
    try{
    var sortedColumn = $("#market" + base).DataTable().state().order[0][0];
    var updateContents = false;
    var updateChange = false;
    var redraw = [];

	// Unfreeze the market
	if(oldTickerData.isFrozen != newTickerData.isFrozen){
		if (newTickerData.isFrozen == 1)
			row.addClass('frozen');
		else
			row.removeClass('frozen');
	}

	// PRICE in market table
	var oldLast = oldTickerData.last;
	var newLast = newTickerData.last;
	if (oldLast != newLast){
		priceChange = oldLast > newLast ? 'priceChangeDown' : 'priceChangeUp';
		redraw[row.find('.price').html(newLast)[0].cellIndex] = true;
		row.addClass(priceChange); // flash a price change color
	   	setTimeout(function(){
	   		row.removeClass(priceChange);
	   	}, 600);
	   	updateContents = true;
	}

	// VOLUME in market table
	var oldTickerVolume = exactRound(oldTickerData.baseVolume,3);
	var newTickerVolume = exactRound(newTickerData.baseVolume,3);
	if (oldTickerVolume != newTickerVolume){
		redraw[row.find('.volume').html(newTickerVolume)[0].cellIndex] = true;
	   	updateContents = true;
	}

	// % CHANGE in market table
	var oldPercentChange = exactRound(oldTickerData.percentChange * 100,2);
	var newPercentChange = exactRound(newTickerData.percentChange * 100,2);
	if (oldPercentChange != newPercentChange){
		var cell = row.find('.change');
		
		if(newPercentChange < 0)
			cell.html(newPercentChange).addClass('neg');
		else
			cell.html('+' + newPercentChange).removeClass('neg');
		
	   	updateContents = true;
	   	updateChange = true;
	   	redraw[cell[0].cellIndex] = true;
	}
	
	if (loggedIn){
		var cellB = row.find('.colBalance');
		var cellV = cell = row.find('.colEstVal');
		var cellB_present = cellB.length > 0;
		var cellV_present = cellV.length > 0;
		if (cellB_present || cellV_present){
			var balance = 0.0;
			if (allBalances instanceof Object)
				balance = (parseFloat(allBalances.balances[quote]) + parseFloat(allBalances.onOrders[quote])).toFixed(4);
			
			if (cellV_present){
				var value = (balance * parseFloat(newTickerData.highestBid)).toFixed(4);
				redraw[cellV.html(value)[0].cellIndex] = true;
			}
			
			if (cellB_present)
				redraw[cellB.html(balance)[0].cellIndex] = true;
		}
	}

	// HIGHLIGHTS - Page heading info box
	// Only if the user has this market in view
	if(currencyPair.toLowerCase() === pair){
		// and data has changed 
		if (updateContents){
			$('#hilights .lastPrice .info').html(newLast);
			document.title = newLast + ' ' + secondaryCurrency + '/' + primaryCurrency + ' Market - Poloniex Bitcoin/Digital Asset Exchange';
		}
		if (updateChange){
			if(newPercentChange < 0)
				$('#hilights .change .info').html(newPercentChange + '%').addClass('neg');
			else
				$('#hilights .change .info').html(newPercentChange + '%').removeClass('neg');
		}
		$('#hilights .high .info').html(newTickerData.high24hr);
		$('#hilights .low .info').html(newTickerData.low24hr);
		$('#hilights .volume .info .vol1').html(newTickerData.baseVolume);
		$('#hilights .volume .info .vol2').html(newTickerData.quoteVolume);
	}

	// Freeze the market
	if (newTickerData.isFrozen == 1) { 
		row.addClass('frozen');
		row.find('.price').html('&nbsp;FROZEN');
		row.find('.volume').empty();
		row.find('.change').empty();
		redraw[sortedColumn] = true; // Force redraw
	}
		
	if (sortedColumn in redraw && redraw[sortedColumn])
		setTimeout(function(){
			$("#market" + base).DataTable().row(row).invalidate().draw();
		},1);
	else if (updateContents)
		$("#market" + base).DataTable().row(row).invalidate();
	} catch (err) { console.log(err); }
}

var orderBookCache,orderBookReady,orderBookTotals,orderBookRates,orderBookFixedRates;
function resetOrderBookCache(){
	orderBookReady = false;
	orderBookCache = {'asks': {}, 'bids': {}};
	orderBookFixedRates = {'asks': {}, 'bids': {}};
	orderBookRates = {asks: [], bids: []};
	orderBookTotals = {'asks': 0.0, 'bids': 0.0};
	marketEventInProgress = false;
	seq = 0;
}

function changeOrderBookPrecision(newPrecision){
	orderBookReady = false;
	orderBookPrecision = Math.max(newPrecision,minPrecision);
	orderBookPrecisionIncrement = 1 / Math.pow(10,orderBookPrecision);
	orderBookFixedRates = {'asks': {}, 'bids': {}};
	for (var side in orderBookCache){
		var isAsk = side == 'asks';
		for (var rate in orderBookCache[side]){
			var amountFloat = parseFloat(orderBookCache[side][rate].amount);
			var totalFloat  = parseFloat(orderBookCache[side][rate].total);
			var fixedRate = fixRate(rate,isAsk);
			if (!(fixedRate in orderBookFixedRates[side]))
				orderBookFixedRates[side][fixedRate] = {};
			orderBookFixedRates[side][fixedRate][rate] = [amountFloat,totalFloat];
		}
	}
	writeBuySellOrdersTable('asks');
	writeBuySellOrdersTable('bids');
	orderBookReady = true;
	processMarketQueue();
}

function setMinPrecision(){
	var bid = parseFloat(allTickerData[currencyPair].highestBid);
	minPrecision = 2;

	if (bid < 0.000001)
		minPrecision = 8;
	else if (bid < 0.0001)
		minPrecision = 6;
	else if (bid < 0.01)
		minPrecision = 4;
	
	var groupToggle = $id("groupToggle");
	var groupPoints = $id("groupPoints");
	limitPrecision = minPrecision != 8 && groupToggle.checked;
	groupToggle.checked = limitPrecision;
	groupToggle.disabled = minPrecision == 8;
	
	if (groupToggle.checked)
		removeClass(groupPoints,"disabled");
	else
		addClass(groupPoints,"disabled");
	
	if (Number(groupPoints.value) < minPrecision)
		groupPoints.value = Math.min(minPrecision,6);

	Array.prototype.forEach.call(groupPoints.getElementsByTagName("option"),function(item){
		item.disabled = (Number(item.value) <  minPrecision);
		if (item.disabled && item.selected)
			item.selected = false;
	});

	changeOrderBookPrecision(orderBookPrecision);
}

function fixRate(rate,isAsk){
	if (limitPrecision){
		var split = rate.split(".");
		rate = split[0] + "." + split[1].substr(0, orderBookPrecision);
		if (isAsk && split[1].substr(orderBookPrecision) > 0)
			rate = (parseFloat(rate) + orderBookPrecisionIncrement).toFixed(orderBookPrecision);
	}
	
	return rate;
}

// Enters an order from either the push or the pull API into our order book object, returning the key (rate)
function cacheOrder(order,side,push,rates_i){
	if (push === true){
		var rate = order.rate;
		var amount = order.amount;
		var amountFloat = parseFloat(amount);
	} else {
		var rate = order[0];
		var amountFloat = push === 0 ? parseFloat(order[1]) : order[1];
		var amount = push === 0 ? order[1] : amountFloat.toFixed(8);
	}
	
	var totalFloat = parseFloat(rate)*amountFloat;
	var total = totalFloat.toFixed(8);
	
	// Update totals
	if (side == 'bids'){
		if (rate in orderBookCache[side])
			orderBookTotals[side] -= parseFloat(orderBookCache[side][rate].total);
		orderBookTotals[side] += totalFloat;
	} else {
		if (rate in orderBookCache[side])
			orderBookTotals[side] -= parseFloat(orderBookCache[side][rate].amount);
		orderBookTotals[side] += amountFloat;
	}
	
	if (typeof rates_i == "undefined"){
		if (orderBookRates[side].indexOf(rate) === -1){
			if (side == 'bids'){
				for (var i in orderBookRates[side])
					if (orderBookRates[side][i]-rate < 0)
						break;
			} else {
				for (var i in orderBookRates[side])
					if (orderBookRates[side][i]-rate > 0)
						break;
			}
			orderBookRates[side].splice(i,0,rate);
		}
	} else {
		orderBookRates[side][rates_i] = rate;
	}
	
	orderBookCache[side][rate] = {rate: rate,amount: amount,total: total,i: rates_i};
	if (limitPrecision){
		var fixedRate = fixRate(rate,side == 'asks');
		if (!(fixedRate in orderBookFixedRates[side]))
			orderBookFixedRates[side][fixedRate] = {};
		orderBookFixedRates[side][fixedRate][rate] = [amountFloat,totalFloat];
	}
	
	return rate;
}

// Removes an order from our order book object
function uncacheOrder(side,rate){
	var i = orderBookRates[side].indexOf(rate);
	if (i >= 0){
		orderBookRates[side].splice(i,1);
		for (i=i; i < orderBookRates[side].length; i++)
			orderBookCache[side][orderBookRates[side][i]].i = i;
	} else
		console.log(rate + " not found in " + side + " book");
	
	if (rate in orderBookCache[side]){
		orderBookTotals[side] -= parseFloat(side == 'bids' ? orderBookCache[side][rate].total : orderBookCache[side][rate].amount);
		delete orderBookCache[side][rate];
		if (limitPrecision){
			var fixedRate = fixRate(rate,side == 'asks');
			if (Object.keys(orderBookFixedRates[side][fixedRate]).length > 1)
				delete orderBookFixedRates[side][fixedRate][rate];
			else
				delete orderBookFixedRates[side][fixedRate];
		}
	} else {
		console.log(rate + " not found in " + side + " index");
	}
}

function orderBookRow(order,side){
	return	  '<tr id="' + order.rate + side + '">'
				+ '<td class="orderRate">' + order.rate + '</td>'
				+ '<td class="orderAmount">' + order.amount + '</td>'
				+ '<td class="orderTotal">' + order.total + '</td>'
				+ '<td class="orderSum">' + order.total + '</td>'
			+ '</tr>';
}

var orderBookTotalsIndex = {asks: 99999, bids: 99999};
function updateTotals(side,rowIndex,execute){
	if (execute !== true){
		orderBookTotalsIndex[side] = Math.min(orderBookTotalsIndex[side],rowIndex);
		return;
	} else if (orderBookTotalsIndex[side] >= 99999 && rowIndex >= 0) {
		return;
	}
	
	rowIndex = rowIndex == -1 ? 0 : orderBookTotalsIndex[side]; // -1 means do the whole thing nao
	orderBookTotalsIndex[side] = 99999;
	var rows = document.getElementById(side + "TableBody").rows;
	if (rowIndex < 0)
		rowIndex = 0;
	else if (rowIndex > rows.length)
		rowIndex = rows.length;
	var total = rowIndex < 1 ? 0.0 : parseFloat(rows[rowIndex-1].cells[3].innerHTML);
	for (var i=rowIndex; i<rows.length; i++)
		rows[i].cells[3].innerHTML = fix(total += parseFloat(rows[i].cells[2].innerHTML));
}

// Insert a new row from the order book cache into the order book table
function insertOrder(side,rate,order){
	var buySide = side == 'bids';
	if (typeof order == "undefined")
		order = orderBookCache[side][rate];
	var rowHTML = orderBookRow(order,side);
	var table = document.getElementById(side + "TableBody");
	var len = table.rows.length;
	var reversed = false;
	
	// Find the row number for insertion
	if (reversed){
		for (var i=table.rows.length-1; i>=0; i--)
			if ((buySide && rate > parseFloat(table.rows[i].id)) ||
				(!buySide && rate < parseFloat(table.rows[i].id)))
				break;
	} else {
		for (var i=0; i<table.rows.length; i++)
			if ((buySide && rate > parseFloat(table.rows[i].id)) ||
				(!buySide && rate < parseFloat(table.rows[i].id)))
				break;
	}
	
	var top = (typeof i == 'undefined') || (!reversed && i == 0) || (reversed && i == table.rows.length-1);
	i = top ? (reversed ? table.rows.length-1 : 0) : parseInt(i);

	var row = table.insertRow(i + (reversed ? 1 : 0));
	row.innerHTML = rowHTML;
	row.id = rate + side;
	row.onclick=function(){orderBookClick(side,this)};
	row.className = "newRow";
	
	if (table.rows.length > orderbookDisplayLimit)
		table.deleteRow(reversed ? 0 : table.rows.length-1);
	if (table.rows.length != len)
		reinitOrderbookPane(buySide ? "buy" : "sell");
	
	updateTotals(side,i-1);
}

function sumOrderRow(side,rate){
	var amount = 0;
	var total = 0;
	
	for (var r in orderBookFixedRates[side][rate]){
		amount += orderBookFixedRates[side][rate][r][0];
		total  += orderBookFixedRates[side][rate][r][1];
	}
	
	return {rate: rate, amount: fix(amount), total: fix(total)};
}

// Update a row in the order book table
function updateOrder(side,rate){
	var order = limitPrecision ? sumOrderRow(side,rate) : orderBookCache[side][rate];
	var row = $id(rate + side);
	row.innerHTML = orderBookRow(order,side);
	
	updateTotals(side,row.rowIndex-1);
}

function asc(a,b){
	return parseFloat(a) - parseFloat(b);
}

function desc(a,b){
	return parseFloat(b) - parseFloat(a);
}

// Remove a row from the order book table (NOT from the cache)
function removeOrder(side,rate){
	var table = $id(side + "TableBody");
	var i = table.rows.length-1;
	var reversed = false;
	
	if (limitPrecision){
		var fixedRates = Object.keys(orderBookFixedRates[side]).sort(side == "asks" ? asc : desc);
		if (fixedRates.length > i){
			var nextRate = fixedRates[i];
			var row = table.insertRow(reversed ? 0 : table.rows.length);
			row.id = nextRate + side;
			row.innerHTML = orderBookRow(sumOrderRow(side,nextRate),side);
		}
	} else if (orderBookRates[side].length>i){
		var row = table.insertRow(reversed ? 0 : table.rows.length);
		var nextRate = orderBookRates[side][i]
		row.id = nextRate + side;
		row.innerHTML = orderBookRow(orderBookCache[side][nextRate],side);
	}
	
	var row = document.getElementById(rate + side);
	var rowIndex = row.rowIndex;
	table.removeChild(row);
	if (table.rows.length-1 != i)
		reinitOrderbookPane(side == 'bids' ? 'buy' : 'sell');
	updateTotals(side,rowIndex-1);
}

function marketEvent(args, kwargs){
	var seqInt = parseInt(kwargs.seq);
	if (seqInt > seq)
		marketEventQueue[kwargs.seq] = args;
	
	if (liveOrderBooks && orderBookReady && seqInt == seq+1)
		processMarketQueue();
	else if (orderBookReady && Object.keys(marketEventQueue).length > 200)
		completelyResetWebsocket();
}

var marketQueueTimeout = false;
function processMarketQueue(){
	if (typeof marketEventQueue != "object"){
		marketEventQueue = {};
		completelyResetWebsocket();
	}
	
	if (marketEventInProgress || !(seq+1 in marketEventQueue))
		return;
	
	marketEventInProgress = true;
	var d = marketEventQueue[++seq];
	delete marketEventQueue[seq];
	processMarketEvent(d);
		
	if (Object.keys(marketEventQueue).length>0){
		marketEventInProgress = false;
		return processMarketQueue();
	}
	
	updateTotals('asks',0,true);
	updateTotals('bids',0,true);
	
	marketEventInProgress = false;
}

function processMarketEvent(args) {
    var tradeMade = false;
    var sideChanged = {asks: false, bids: false};
    
    try{
	    for (argX = 0; argX < args.length; argX++) {
	        var data = args[argX];
	        var type = data['type'];
	        if (data['type'] == "newTrade") {
		        tradeMade = true;
	            var entry = data['data'];
	            var tradeID = entry['tradeID'];

	            if (entry['type'] == 'buy') {
	                typeString = "<span class='buyClass'>Buy</span>";
	            } else {
	                typeString = "<span class='sellClass'>Sell</span>";
	            }
	            var row = '<td class="date"><span class="year">' + entry['date'].substring(0, 5) + '</span>' + entry['date'].substring(5,16) + '<span class="seconds">' + entry['date'].substring(16) + '</span></td>';
				row += '<td class="type">' + typeString + '</td>';
				row += '<td>' + exactRound(entry['rate'], maxDecimals) + '</td>';
				row += '<td>' + exactRound(entry['amount'], maxDecimals) + '</td>';
				row += '<td>' + exactRound(entry['total'], maxDecimals) + '</td>';
				
				var tradeHistoryTable = document.getElementById('tradeHistoryTableBody');
				var newRow = tradeHistoryTable.insertRow(0);
				newRow.className = "newRow";
				newRow.innerHTML = row;
				tradeHistoryTable.deleteRow(tradeHistoryTable.rows.length-1);
				
				try {
					var ch_i = allChartData[chartType]['candleStick'].length-1;
					var stick = allChartData[chartType]['candleStick'][ch_i];
					stick.close = parseFloat(entry['rate']);
					stick.high = Math.max(stick.high,stick.close);
					stick.low = Math.min(stick.low,stick.close);
					stick.volume += parseFloat(entry['total']);
					allChartData[chartType]['candleStick'][ch_i] = stick;
				} catch (cerr) {
					
				}
	        }
	
	        if (type == "orderBookModify" || type == "orderBookRemove") {
		        var i = argX;
		        
				order = data['data'];
				side = order['type'] + 's';
				rate = order.rate;
				sideChanged[side] = true;
				
				if (type == 'orderBookModify')
					cacheOrder(order,side,true);
				else
					uncacheOrder(side,rate);
				
				fixedRate = limitPrecision ? fixRate(rate,side == "asks") : rate;
				row = document.getElementById(fixedRate + side);
				
				if (row === null){
					if (type == 'orderBookModify'){
						lastRate = parseFloat(document.getElementById(side + 'TableBody')['lastChild'].id);
						if ((side == 'asks' && parseFloat(fixedRate) < lastRate) ||
							(side == 'bids' && parseFloat(fixedRate) > lastRate)){
							if (limitPrecision)
								insertOrder(side,fixedRate,{rate: fixedRate, amount: order.amount, total: orderBookCache[side][rate].total});
							else
								insertOrder(side,rate);
						}
					}
				} else {
					if (type == 'orderBookRemove' && !(limitPrecision && (fixedRate in orderBookFixedRates[side])))
						removeOrder(side,fixedRate);
					else
						updateOrder(side,fixedRate);
				}
	        }
	    }
	} catch (e) {
		console.log(e);
		marketEventQueue = {};
		return completelyResetWebsocket();
	}
    
    if (Object.keys(marketEventQueue).length>1)
    	return;
    
    if (sideChanged.asks)
        document.getElementById("asksTotal").innerHTML = orderBookTotals.asks.toFixed(8);
    
    if (sideChanged.bids)
        document.getElementById("bidsTotal").innerHTML = orderBookTotals.bids.toFixed(8);
       
    if (orderBookRates.bids[0] >= orderBookRates.asks[0]){
		    marketEventQueue = {}
		    return completelyResetWebsocket();
    }
    
    if (updatesPaused)
    	$(".newRow").removeClass("newRow");
    else if (tradeMade)
    	updateChart = true;
}


function alertEvent(args, kwargs) {
	data = args[0];
	if (data['type']=="notice"){
		refreshNoticesBoard();
	}
	if (data['type']=="alert"){
		$("#alertsTab .msg").html(data['message']); 
		$("#alertsTab .date").html("Posted by " + data['postedBy'] + " on " + data['date']); 
		alertID = data['id'];
		$("#alertsTab").removeClass( "dismissed" ).addClass( "closed" );
	}
	if (data['type']=='announcement'){
/*		if (data['message']=='pfft'){
			var announcementHTML = '';
			announcementHTML += '<div class="message">pfft! to begin soon. Get those bags ready.</div>';
			$("#trollboxAnnouncement .row").html(announcementHTML);
			targetTime = data['targetTime'];
			countdownIntervalId = setInterval(updateCountdown,1000);
			$("#trollboxAnnouncement").css("display", "block");
		}*/
	}
}

function heartbeatEvent (args, kwargs){
	lastHeartbeat = Math.floor(Date.now()/1000);
}

function footerEvent (args, kwargs){
	var footerData = args[0];
	$("#serverTime").html(footerData['serverTime']);
	$("#usersOnline").html(footerData['usersOnline']);
	for (var vc in footerData.volume)
		$("#" + vc.toLowerCase() + "VolumeFooter").html(footerData.volume[vc].split(".")[0]);
}

function userEvent (args, kwargs){
}

function unsubscribe(channel,conn){
	if (conn.readyState == 1 && channel > 0){
		if (channel == marketChannel)
			marketChannel = 0;
		conn.send(JSON.stringify({command: "unsubscribe", channel: channel}));
		if ('subscriptions' in conn)
			delete conn.subscriptions[channel];
	} else if (marketSubscription instanceof autobahn.Subscription){
		marketSubscription.unsubscribe();
		marketSubscription = null;
	}
}

function unsubscribeAll(){
	if ('conn' in window && window.conn.readyState != 0)
		for (var channel in window.conn.subscriptions)
			unsubscribe(channel,window.conn);
}

function webSockets_subscribe(channel,conn){
	if (conn.readyState == 1){
		var params = {command: "subscribe",channel: channel};
		if (channel == 1000)
			params['userID'] = usid;
		conn.send(JSON.stringify(params));
	}
}

function startOrderBook(){
	if (quickOrderBookLoading)
		return setTimeout(startOrderBook,250);

	setMinPrecision();
	orderBookReady = true;
	setBookUIstate();
	fullOrderBookLoading = false;
	
	processMarketQueue();
	
	refreshDepthChart();
}
var webSocketConnected = false;
var webSocketConnecting = true;
var webSocketConnectionID = 0;
var marketChannel = 0;
var logseq = 10;
function initWebSockets_new(){
	if (webSocketConnected)
		return;
	webSocketConnected = true;
	webSocketConnecting = true;
	window.conn = new WebSocket('wss://api2.poloniex.com');
    window.conn['subscriptions'] = {};
    
    window.conn.onopen = function(e){
	    webSocketConnecting = false;
	    lastHeartbeat = Math.floor(Date.now()/1000);
	    
	    window.conn['connectionID'] = ++webSocketConnectionID;
	    if (loggedIn && !isLocal)
	    	webSockets_subscribe(1000,e.target);
	    
	    webSockets_subscribe(1001,e.target);
	    webSockets_subscribe(1002,e.target);
	    webSockets_subscribe(1003,e.target);
	    resetOrderBookCache();
	    webSockets_subscribe(currencyPair,e.target);
	    window.conn['keepAlive'] = setInterval(function(){
			try{
				window.conn.send(".");
			} catch (err) {
				resetWebsocket();
			}
    	},60000);
    }
    
    window.conn.onmessage = function(e){
	    if (e.target.connectionID != webSocketConnectionID)
	    	return e.target.close();
	    
	    lastHeartbeat = Math.floor(Date.now()/1000);
	    
	    if (e.data.length == 0)
	    	return;
	    
	    var msg = JSON.parse(e.data);
	    if (msg[1] == 1)
	    	return e.target.subscriptions[msg[0]] = true;;
	    
	    if ('error' in msg)
	    	return console.log(msg);
	    
	    if (msg[1] === 0)
	    	return delete e.target.subscriptions[msg[0]];
	    	
	    switch (msg[0]){
		    case 1000:
		    	for (var i in msg[2]){
			    	var arg = msg[2][i];
			    	switch (arg[0]){
				    	case "b":
				    		if (arg[2] == "e"){
					    		var c = isNaN(Number(arg[1])) ? arg[1] : markets_currencies.byID[arg[1]].symbol;
					    		allBalances.balances[c] = fix(parseFloat(allBalances.balances[c]) + parseFloat(arg[3]));
					    		if (c == primaryCurrency)
					    			$("#primaryBalance,#stopLimitPrimaryBalance").html(allBalances.balances[c]);
					    		else if (c == secondaryCurrency)
					    			$("#secondaryBalance,#stopLimitSecondaryBalance").html(allBalances.balances[c]);
					    	}
				    		break;
				    	
				    	case "o":
				    		if (arg[2] === "0.00000000"){
					    		for (var oi in openOrders.limit){
						    		if (openOrders.limit[oi].orderID == arg[1]){
							    		delete openOrders.limit[oi];
							    		break;
						    		}
					    		}
				    			$("#myOrdersTable").DataTable().row("#orderRow-" + arg[1]).remove().draw();
				    		} else {
					    		var orderRow = $("#orderRow-" + arg[1]);
					    		orderRow.find("td.amount").html(arg[2]);
					    		orderRow.find("td.total").html( fix(parseFloat(arg[2]) * parseFloat(orderRow.find("td.rate").html())) );
				    		}
				    		
				    		break;
				    	
				    	case "n":
				    		if (arg[1] != marketChannel)
				    			break;
				    		
				    		var item = {orderID: arg[2],
					    				type:	 arg[3] == 1 ? "buy" : "sell",
					    				rate:	 arg[4],
					    				amount:	 arg[5],
					    				total:	 fix(parseFloat(arg[4]) * parseFloat(arg[5])),
					    				date:	 arg[6]};
				    		openOrders.limit.push(item);
				    		writeMyOpenOrdersTable(openOrders);
				    		break;
				    	
				    	case "t":
				    		
				    		break;
			    	}
		    	}
		    	return;
		    
		    case 1001:
		    	//trollboxEvent(msg);
		    	break;
		    
		    case marketChannel:
		    	var args = [];
		    	var kwargs = {seq: msg[1]};
		    	if (logseq){
			    	if (logseq-- <= 0)logseq=false;
			    	console.log(kwargs.seq);
			    }
		    	for (var i in msg[2]){
			    	var arg = msg[2][i];
			    	switch (arg[0]){
			    		case "o":
				    		args.push({
					    		type: "orderBook" + (arg[3] === "0.00000000" ? "Remove" : "Modify"),
					    		data: { type: (arg[1] == 1 ? "bid" : "ask"),
						    			rate: arg[2],
						    			amount: arg[3]
					    		}
				    		});
				    		break;
				    	
				    	case "t":
				    		args.push({
					    		type: "newTrade",
					    		data: {	tradeID: arg[1],
						    			type: (arg[2] == 1 ? "buy" : "sell"),
						    			rate: arg[3],
						    			amount: arg[4],
						    			total: fix(parseFloat(arg[3]) * parseFloat(arg[4])),
						    			date: timestampToDate(arg[5],true)
					    		}
				    		});
				    		break;
			    	}
		    	}

		    	marketEvent(args, kwargs);
		    	break;
		    
		    case 1002:
		    	msg[2][0] = markets.byID[msg[2][0]].currencyPair;
		    	tickerEvent(msg[2]);
		    	break;
		    
		    case 1003:
		    	$id("serverTime").innerHTML = msg[2][0];
				$id("usersOnline").innerHTML = msg[2][1];
				for (var vc in msg[2][2])
					$("#" + vc.toLowerCase() + "VolumeFooter").html(msg[2][2][vc].split(".")[0]);
		    	break;
		    	
		    case 1010:
		    	// Heartbeat
		    	break;
		    
		    case 2000:
		    	if (msg[2][1] == "cancelOrder" || msg[2][1] == "cancelTriggerOrder"){

		    	} else {
			    	$("#result").html(msg[2][2]['response']).attr("noRefresh",true);
					showAlert();
				}
		    	break;
		    
		    default:
		    	if (msg[0] > 0 && msg[0] < 1000){
			    	if (msg[2][0][0] == "i"){
				    	var marketInfo = msg[2][0][1];
				    	if (marketInfo.currencyPair != currencyPair)
				    		break;
				    	
				    	marketChannel = msg[0];
				    	window.conn.subscriptions[marketChannel] = true;
						
						fullOrderBookLoading = true;
				    	seq = msg[1];
				    	logseq = false;
				    	var d = marketInfo.orderBook;
				    	for (var side in [0,1]){
				    		var ii = 0;
					    	for (var i in d[side])
								cacheOrder([i,d[side][i]],(side == 0 ? 'asks' : 'bids'),0,ii++);
						}
						
						for (var i in marketEventQueue)
							if (parseInt(i) <= seq)
								delete marketEventQueue[i];
												
						startOrderBook();
			    	}
		    	}
		    	break;
	    }
    }
    
    window.conn.onerror = function(e){
	    if (e.target.connectionID != webSocketConnectionID)
	    	e.target.close();
	    else 
	    	unsubscribeAll();
    }
    
    window.conn.onclose = function(e){
	    if (typeof e == "object" && 'keepAlive' in e.target){
	    	clearInterval(e.target.keepAlive);
	    	if (e.target.connectionID != webSocketConnectionID)
	    		return true;
	    	if (e.target.readyState == 1)
	    		return e.target.close();
	    }
	    unsubscribeAll();
	    window.conn.subscriptions = {};
	    marketEventQueue = {};
	    marketChannel = 0;
	    lastHeartbeat = Math.floor(Date.now()/1000) + 2;
	    setTimeout(function(){
		    webSocketConnected = false;
		    initWebSockets_new();
		}, e === true ? 250 : 2000);
    }
}

function initWebSockets(refresh) {
	if (newWebSockets)
		return initWebSockets_new();
	
	var wsuri = "wss://api.poloniex.com";
	marketEventQueue = {};
	if (typeof refresh == "undefined")
		refresh = false;
	
	window.connection = new autobahn.Connection({
		url: wsuri,
		realm: "realm1"
	});
	
	window.connection.onopen = function (session) {
		session.subscribe(currencyPair, marketEvent).then(function(subscription){
			marketSubscription = subscription;
			if (refresh === true)
				refreshOrderBook_br();
		});
		
		//session.subscribe('trollbox', trollboxEvent);
		session.subscribe('ticker', tickerEvent);
		session.subscribe('alerts', alertEvent);
		session.subscribe('heartbeat', heartbeatEvent);
		session.subscribe('footer', footerEvent);
	}
	
	window.connection.onclose = function(){}
	
    window.connection.open();
}

function resetWebsocket(refresh) {
	if ('conn' in window)
		return window.conn.close();
	
	if (typeof window.connection !== 'undefined' && window.connection.session !== null)
		window.connection.close();
	initWebSockets(refresh);
}

function completelyResetWebsocket(){
	lastHeartbeat = Math.floor(Date.now()/1000);
	
	setTimeout(refreshTradeHistory,0);
	//setTimeout(hardRefreshTrollbox,0);
	setTimeout(hardRefreshTicker,0);
	
	if ('conn' in window){
		resetWebsocket();
	} else if ('connection' in window && window.connection.session !== null){
		window.connection.close();
		initWebSockets(true);
	}
}

function checkHeartbeat(){
	if (updatesPaused || webSocketConnecting)
		return;
	if ((Math.floor(Date.now()/1000) - lastHeartbeat) > (newWebSockets ? 10 : 10) || (Object.keys(marketEventQueue).length > 100 && !(seq+1 in marketEventQueue)))
		completelyResetWebsocket();
}


function checkAllJSLoaded() {
	if (marketTablesJsLoaded === true && chartsJsLoaded === true && privateInfoFetched === true) {
		clearInterval(loadCheckInterval);
		loadExchangeSettings();
		initClicks();
		initNonMarketTables();
		getTickerInfo(); // Which then calls > initMarketTables() > updateMarketDisplay() > refreshAll()
		initCharts_br_js();
		//initWebSockets();
		$( window ).unload(function() { saveExchangeSettings(); });
	}
}


function submitStopLimitOrder() {
    hideStopLimitAlert();
    showProgressBar();

    url = '/private.php';
    command = $('#stopLimitCommand').val();
    if (margin)
    	command = "marginS" + command.substring(1, command.length);
    var posting = $.get(url, { currencyPair: currencyPair, rate: $('#stopLimitRate').val(), amount: $('#stopLimitAmount').val(), stopRate: $('#stopLimitStopRate').val(), command: command});
    posting.done(function (data) {
        var content = $(data);
        $("#result").empty().append(content);
        showAlert();
        updatePrivateInfo();
        setTimeout(updatePrivateInfo, 2100);
    });

}



$("#stopLimitForm").submit(function (event) {
    event.preventDefault();
    
    if ($("#dimmer").is(":visible"))
    	return $("#alertDivOK").click();
    
    if (document.getElementById('stopLimitAmount').value < 0.01)
        return showAlert("Amount must be greater than 0.01.");

    if (document.getElementById('stopLimitRate').value < 0.00000001)
		return showAlert("Limit must be greater than zero.");
	
	if (document.getElementById('stopLimitStopRate').value < 0.00000001)
		return showAlert("Stop must be greater than zero.");

    var stopLimitText = "If the ";
    if ($('#stopLimitCommand').val() == "stopLimitBuy") {
        stopLimitText += "lowest ask rises to or above ";
    } else {
        stopLimitText += "highest bid drops to or below ";
    }
    stopLimitText += parseFloat($('#stopLimitStopRate').val()) + " " + primaryCurrency + ", an order to ";
    if ($('#stopLimitCommand').val() == "stopLimitBuy") {
        stopLimitText += "buy ";
    } else {
        stopLimitText += "sell ";
    }
    stopLimitText += parseFloat($('#stopLimitAmount').val()) + " " + secondaryCurrency + " at a price of " + parseFloat($('#stopLimitRate').val()) + " " + primaryCurrency + " will be placed.";

    $("#stopLimitAlertText").empty().append(stopLimitText);

    showStopLimitAlert();

});


$("#buyForm").submit(function (event) {
    event.preventDefault();
    
    if ($("#dimmer").is(":visible"))
    	return $("#alertDivOK").click();
    
    if (Number(document.getElementById('buyAmount').value) * Number(document.getElementById('buyRate').value) < 0.0001) {
        $("#result").empty().append("Total must be at least 0.0001.");
        showAlert();
        return;
    }

    if (document.getElementById('buyRate').value < 0.00000001) {
        $("#result").empty().append("Price must be greater than zero.");
        showAlert();
        return;
    }

    showProgressBar();
    var $form = $(this),
    url = '/private.php';
    params = {	currencyPair: currencyPair,
	    		rate: $('#buyRate').val(),
	    		amount: $('#buyAmount').val(),
	    		command: (margin ? 'marginBuy' : 'buy')};
	if (margin)
		params['maxRate'] = $("#buyMaxRate").val() === undefined ? 0.005 : $("#buyMaxRate").val();
	
	if (webSocketCall(params))
		return true;
	
    var posting = $.get(url, params);
    posting.done(function (data) {
        var content = $(data);
        $("#result").empty().append(content);
        showAlert();
        updatePrivateInfo();
    });

});

$("#sellForm").submit(function (event) {
    event.preventDefault();
    
    if ($("#dimmer").is(":visible"))
    	return $("#alertDivOK").click();

    if (Number(document.getElementById('sellAmount').value) * Number(document.getElementById('sellRate').value) < 0.0001) {
        $("#result").empty().append("Total must be at least 0.0001.");
        showAlert();
        return;
    }

    if (document.getElementById('sellRate').value < 0.00000001) {
        $("#result").empty().append("Price must be greater than zero.");
        showAlert();
        return;
    }
    showProgressBar();
    var $form = $(this),
    url = '/private.php';
    params = {	currencyPair: currencyPair,
	    		rate: $('#sellRate').val(),
	    		amount: $('#sellAmount').val(),
	    		command: (margin ? 'marginSell' : 'sell')};
	if (margin)
		params['maxRate'] = $("#sellMaxRate").val() === undefined ? 0.005 : $("#sellMaxRate").val();
	
	if (webSocketCall(params))
		return true;
	
    var posting = $.get(url, params);
    posting.done(function (data) {
        var content = $(data);
        $("#result").empty().append(content);
        showAlert();
        updatePrivateInfo();
    });

});

function closeMarginPosition(currencyPair){
	$("#confirmDivMessage").html("This will close your margin position with a market order. Are you sure?");
	$("#confirmDivOK").unbind('click');
	$("#confirmDivCancel").unbind('click');
	$("#confirmDivOK").click(function(){executeCloseMarginPosition(currencyPair);});
	$("#confirmDivCancel").click(hideConfirmDiv);
	showConfirmDiv();
}

function executeCloseMarginPosition(currencyPair){
	hideConfirmDiv(true);
	showProgressBar();
	$.get("/private.php",{command: "closeMarginPosition",currencyPair: currencyPair}).done(function(data){
		$("#result").html(data);
		showAlert();
		updatePrivateInfo();
	});
}

function pauseUpdates(){
	if (windowActive)return;
	if (updatesPaused)return;
	updatesPaused = true;
	$(".newRow").removeClass("newRow");
	if (liveOrderBooks)
		setOrderBookUpdateInterval(2000);
	
	if ('conn' in window && 1001 in window.conn.subscriptions)
		unsubscribe(1001,window.conn);
}

function resumeUpdates(){
	clearTimeout(pauseTimeout);
	if (!updatesPaused)return;
	updatesPaused = false;
	$(".newRow").removeClass("newRow");
	
	if ($id("throttleToggle").checked)
		$("#throttleFreq").change();
	else
		setOrderBookUpdateInterval(0);
	
	refreshChart();
	//setTimeout(hardRefreshTrollbox,0);
	if (newWebSockets)
		webSockets_subscribe(1001,window.conn);
}

var pauseTimeout;
function blur(){
	windowActive = false;
	pauseTimeout = setTimeout(pauseUpdates, 60000);
};

function focus(){
	windowActive = true;
	resumeUpdates();
};

var orderBookUpdateInterval;
function setOrderBookUpdateInterval(ms){
	clearInterval(orderBookUpdateInterval);
	liveOrderBooks = ms == 0;
	if (liveOrderBooks)
		processMarketQueue();
	else
		orderBookUpdateInterval = setInterval(processMarketQueue, ms);
}

$(document).ready(function() {
	//resetOrderBookCache();
	initHashChanges();
	updatePrivateInfo();
	clearInterval(loadCheckInterval);
	loadCheckInterval = setInterval(checkAllJSLoaded, 100);
	
	$(document).keyup(function(e){
		var keyCode = e.which;
		
		if (e.shiftKey && e.altKey && keyCode >= 48 && keyCode <= 53){
			e.preventDefault();
			var t = (keyCode - 48);
			if (t)
				$('#throttleFreq').val(t);
			$('#throttleToggle').prop("checked",!t).click();
		}
	});
	
	setInterval(updatePrivateInfo,privateRefreshInterval);
	setInterval(refreshCandleSticks,candleStickRefreshInterval);
	setInterval(refreshDepthChart,depthChartRefreshInterval);
	setInterval(executeReinits, 1000);
	setInterval(checkHeartbeat, 10000);
	
	setInterval(function(){
		if (updateChart){
			updateChart = false;
			refreshChart();
		}
	}, 1000);
	
	if (/*@cc_on!@*/false) { // check for Internet Explorer
		document.onfocusin = focus;
		document.onfocusout = blur;
	} else {
		window.onfocus = focus;
		window.onblur = blur;
	}
	
} );