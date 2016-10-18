var citeSummaryVis = (function () {

    var selfCiteColors = d3.scale.ordinal().domain(["self", "not self"]).range(["#3498db", "#e74c3c"]);
    var subjectAreaColors = d3.scale.ordinal().range(["#1abc9c", "#27ae60", "#3498db", "#9b59b6", "#34495e", "#f39c12", "#d35400", "#c0392b", "#95a5a6"]);
    var citationTypeColors = d3.scale.ordinal().range(["#1abc9c", "#27ae60", "#3498db", "#9b59b6", "#34495e", "#f39c12", "#d35400", "#c0392b", "#95a5a6"]);
    var dateFormat = "%d %b %Y";

    var cleanupMapping = {
        "hep-th": "Theory-HEP",
        "hep-ex": "Experiment-HEP",
        "nucl-th": "Theory-Nucl",
        "hep-ph": "Phenomenology-HEP",
        "nucl-ex": "Experiment-Nucl",
        "hep-lat": "Lattice"
    };

    var formatNumber = d3.format(",d"),
        formatDate = d3.time.format(dateFormat),
        formatTime = d3.time.format("%I:%M %p");

    var parseDate = function (d) {
        return new Date(d.substring(0, 4),
            d.substring(5, 7),
            d.substring(8));
    };

    var sortByDateAscending = function (a, b) {

        if (typeof a === 'string') {
            a = d3.time.format(dateFormat).parse(a);
            b = d3.time.format(dateFormat).parse(b);
            return b - a;
        } else {
            return b.citation_date - a.citation_date;
        }

    };

    var calculateWindowWidth = function () {
        return $(window).width();
    };

    var calculateVisWidth = function (windowWidth, normal_width_ratio) {
        if (windowWidth <= 900) {
            return windowWidth * 0.63;
        } else {
            return windowWidth * normal_width_ratio;
        }
    };

    var processData = function (data) {
        /*
         Parses the data fields
         */

        var flattened = flattenJson(data);

        flattened.forEach(function (d, i) {
            d.index = i;
            d.paper_date = parseDate(d.paper_date);
            d.citation_date = parseDate(d.citation_date);

            if (d.paper_subject in cleanupMapping)
                d.paper_subject = cleanupMapping[d.paper_subject];

            if (d.citation_subject in cleanupMapping)
                d.citation_subject = cleanupMapping[d.citation_subject];

            if(d.citation_subject.indexOf('astro') != -1)
                d.citation_subject = "Astrophysics";
        });

        return flattened;
    };


    var flattenJson = function (data) {
        /*
         Flattens the JSON out to be suitable for use in
         crossfilter.
         */
        var flattened = [];
        data.forEach(function (d, i) {

            var _record = {};

            Object.keys(d).forEach(function (k) {
                if (k !== 'citations')
                    _record['paper_' + k] = d[k];
            });

            d.citations.forEach(function (d) {
                var _citationRecord = $.extend({}, _record);

                Object.keys(d).forEach(function (k) {
                    if (k !== 'citations')
                        _citationRecord['citation_' + k] = d[k];
                });

                flattened.push(_citationRecord);
            });

        });

        return flattened;

    };

    return {
        renderSummary: function (data) {

            var citationData = processData(data);

            var papers = crossfilter(citationData),

                citationsByDate = papers.dimension(function (d) {
                    return d.citation_date;
                }),

                citationType = papers.dimension(function (d) {
                    return d.citation_document_type;
                }),

                selfCitation = papers.dimension(function (d) {
                    return d.citation_selfcite ? "self" : "not self";
                }),

                subjectArea = papers.dimension(function (d) {
                    return d.citation_subject;
                });

            var citationCountGroup = citationsByDate.group(),
                citationTypeCount = citationType.group(),
                selfTypeCount = selfCitation.group(),
                subjectAreaCount = subjectArea.group();


            var cumulativeCitationGroup = {
                all: function () {
                    var cumulate = 0;
                    var g = [];
                    citationCountGroup.all().forEach(function (d, i) {
                        cumulate += d.value;
                        g.push({
                            key: d.key,
                            value: cumulate,
                            single_value: d.value
                        });
                    });
                    return g;
                }
            };

            var minPaperDate = new Date(citationsByDate.bottom(1)[0].citation_date);
            var maxPaperDate = new Date(citationsByDate.top(1)[0].citation_date);

            var minDate = minPaperDate;
            var maxDate = maxPaperDate;
            minDate.setDate(minDate.getDate() - 30);
            maxDate.setDate(maxDate.getDate() + 30);

            var windowWidth = calculateWindowWidth();


            var all = papers.groupAll();

            // Updated version
            dc.dataCount(".dc-data-count")
                .dimension(papers)
                .group(all);

            var rptLine = dc.compositeChart(document.getElementById("citations"));

            rptLine
                .width(calculateVisWidth(windowWidth, 0.85))
                .height(300)
                .margins({top: 10, right: 50, bottom: 30, left: 60})
                .x(d3.time.scale().domain([minDate, maxDate]))
                .xUnits(d3.time.months)
                .renderHorizontalGridLines(true)
                .dimension(citationsByDate)
                .elasticY(true)
                .renderVerticalGridLines(true)
                .compose([
                    dc.lineChart(rptLine)

                        .group(cumulativeCitationGroup, 'Cumulative Citations')
                        .valueAccessor(function (d) {
                            return d.value;
                        })
                        .colors(['#2980b9']),

                    dc.barChart(rptLine)
                        .group(citationCountGroup, 'Citations')
                        .colors(['#3498db'])

                ]);

            rptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                .brushOn(true);



            dc.pieChart("#citation_subjects")
                .width(350)
                .dimension(citationType)
                .group(citationTypeCount)
                .colors(citationTypeColors);

            dc.pieChart("#self_cites")
                .width(350)
                .dimension(selfCitation)
                .group(selfTypeCount)
                .colors(selfCiteColors);

            dc.pieChart("#subject_area")
                .width(350)
                .dimension(subjectArea)
                .group(subjectAreaCount)
                .colors(subjectAreaColors);


            var detailTable = dc.dataTable('#data_table');
            detailTable.dimension(citationsByDate)
                .group(function (d) {
                    return '<i class="fa fa-calendar"></i> ' + formatDate(d.citation_date);
                })

                .columns([
                    function () {
                        return "";
                    },
                    function (d) {
                        return d.citation_id;
                    },

                    function (d) {
                        return '<span class="label ' + (d.citation_selfcite ? "label-danger" : "label-default") + '">' + (d.citation_selfcite ? " Self Citation" : "") + '</span> ' +
                            '<a href="/record/' + d.citation_id + '" target="_blank">' + d.citation_title + '</a>';
                    },

                    function (d) {
                        return d.citation_document_type;
                    },
                    function (d) {
                        return d.citation_subject;
                    },
                    function (d) {
                        return;
                    }
                ]).sortBy(function (d) {
                    return d.citation_date;
                })
                .order(sortByDateAscending);

            dc.renderAll();

        }
    };

})();