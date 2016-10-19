var citeSummaryVis = (function () {

    var selfCiteColors = d3.scale.ordinal().domain(["self", "not self"]).range(["#3498db", "#e74c3c"]);
    var dateFormat = "%d %b %Y";

    var cleanupMapping = {
        "hep-th": "Theory-HEP",
        "hep-ex": "Experiment-HEP",
        "nucl-th": "Theory-Nucl",
        "hep-ph": "Phenomenology-HEP",
        "nucl-ex": "Experiment-Nucl",
        "hep-lat": "Lattice",
        "gr-qc": "General Relativity",
        "quant-ph": "Quantum Physics",
        "Nuclear Reactions": "General Physics",
        "double-beta decay": "General Physics",
        "astro": "Astrophysics",
        "math": "Math and Math Physics",
        "cs": "Computing",
        "stat": "Data Analysis and Statistics",
        "cond": "Other",
        "nlin": "Other",
        "Relativistic": "Experiment-HEP"
    };

    var formatNumber = d3.format(",d"),
        formatDate = d3.time.format(dateFormat),
        formatTime = d3.time.format("%I:%M %p"),
        normalisedNumberFormat = d3.format("s");

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

    var createRowChart = function(placement, dimension, group, colors) {
        var chart = dc.rowChart(placement)
            .dimension(dimension)
            .height(500)
            .width(300)
            .group(group)
            .colors(colors);

        chart.xAxis().ticks(5);
        chart.xAxis().tickFormat(normalisedNumberFormat);
    };

    var createPieChart = function(placement, dimension, group, colors) {
        dc.pieChart(placement)
            .dimension(dimension)
            .width(250)
            .group(group)
            .colors(colors);
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

            ["paper", "citation"].forEach(function (s) {
                var subject = d[s + '_subject'];
                if (d[s + '_subject'] in cleanupMapping) {
                    d[s + '_subject'] = cleanupMapping[subject];
                } else {
                    Object.keys(cleanupMapping).forEach(function(k){
                        if (subject.indexOf(k) != -1) {
                            d[s+'_subject'] = cleanupMapping[k];
                            return;
                        }
                    })
                }
            });
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
            var multiPaper = false;
            if (data.length > 1) {
                multiPaper = true;
            }

            var citationData = processData(data);

            var papers = crossfilter(citationData),

                citationsByDate = papers.dimension(function (d) {
                    return d.citation_date;
                }),

                citationsByYear = papers.dimension(function (d) {
                    return d3.time.year(d.citation_date);
                }),

                citationType = papers.dimension(function (d) {
                    return d.citation_document_type;
                }),

                selfCitation = papers.dimension(function (d) {
                    return d.citation_selfcite ? "self" : "not self";
                }),

                citationIsCollaboration = papers.dimension(function (d) {
                    return d.citation_collaboration ? "Collaboration Paper" : "Not a Collaboration Paper";
                }),

                citationSubjectArea = papers.dimension(function (d) {
                    return d.citation_subject;
                });


            var papersByDate = papers.dimension(function (d) {
                    return d.paper_date;
                }),
                papersByYear = papers.dimension(function (d) {
                    return d3.time.year(d.paper_date);
                }),
                paperType = papers.dimension(function (d) {
                    return d.paper_document_type;
                }),
                paperSubjectArea = papers.dimension(function (d) {
                    return d.paper_subject;
                }),
                paperIsCollaboration = papers.dimension(function (d) {
                    return d.paper_collaboration ? "Collaboration Paper" : "Not a Collaboration Paper";
                });


            var paperCountGroup = papersByDate.group(),
                papersByYearCount = papersByYear.group(),
                paperTypeCount = paperType.group(),
                paperSubjectAreaCount = paperSubjectArea.group();


            var citationCountGroup = citationsByDate.group(),
                citationsByYearGroup = citationsByYear.group(),
                citationTypeCount = citationType.group(),
                selfTypeCount = selfCitation.group(),
                citationSubjectAreaCount = citationSubjectArea.group(),
                citationIsCollaborationCount = citationIsCollaboration.group();


            var cumulativeCitationGroup = {
                all: function () {
                    var cumulate = 0;
                    var g = [];
                    citationsByYearGroup.all().forEach(function (d, i) {
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


            var cumulativePaperGroup = {
                all: function () {
                    var cumulate = 0;
                    var g = [];
                    papersByYearCount.all().forEach(function (d, i) {
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



            var windowWidth = calculateWindowWidth();


            var all = papers.groupAll();

            // Updated version
            dc.dataCount("#citations_summary")
                .dimension(papers)
                .group(all);

            var margins = {top: 10, right: 30, bottom: 30, left: 50};
            if (multiPaper) {

                var minPaperDate = new Date(papersByDate.bottom(1)[0].paper_date);
                var maxPaperDate = new Date(papersByDate.top(1)[0].paper_date);

                minPaperDate.setDate(minPaperDate.getDate() - 30);
                maxPaperDate.setDate(maxPaperDate.getDate() + 30);

                var papersColor = ["#95a5a6"];

                dc.barChart("#papers_year")
                    .height(200)
                    .margins(margins)
                    .width(calculateVisWidth(windowWidth, multiPaper ? 0.42 : 0.85))
                    .x(d3.time.scale().domain([d3.time.year(minPaperDate), d3.time.year(maxPaperDate)]))
                    .xUnits(d3.time.years)
                    .dimension(papersByYear)
                    .group(papersByYearCount)
                    .colors(papersColor);

                var papersRptLine = dc.compositeChart(document.getElementById("papers"));

                papersRptLine
                    .width(calculateVisWidth(windowWidth, multiPaper ? 0.42 : 0.85))
                    .height(200)
                    .margins(margins)
                    .x(d3.time.scale().domain([minPaperDate, maxPaperDate]))
                    .xUnits(d3.time.months)
                    .renderHorizontalGridLines(true)
                    .dimension(papersByYear)
                    .elasticY(true)
                    .elasticX(true)
                    .renderVerticalGridLines(true)
                    .compose([

                        dc.lineChart(papersRptLine)

                            .group(cumulativePaperGroup, 'Cumulative Papers')
                            .valueAccessor(function (d) {
                                return d.value;
                            })
                            .colors(papersColor),

                        dc.barChart(papersRptLine)
                            .group(papersByYearCount, 'Papers')
                            .colors(papersColor)

                    ]);

                papersRptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                    .brushOn(true);

                createRowChart("#papers_document_type", paperType, paperTypeCount, papersColor);
                createRowChart("#papers_subject_area", paperSubjectArea, paperSubjectAreaCount, papersColor);
            }


            var citationRptLine = dc.compositeChart(document.getElementById("citations"));

            var minCitationDate = new Date(citationsByDate.bottom(1)[0].citation_date);
            var maxCitationDate = new Date(citationsByDate.top(1)[0].citation_date);

            minCitationDate.setDate(minCitationDate.getDate() - 30);
            maxCitationDate.setDate(maxCitationDate.getDate() + 30);

            var citationsColor = ["#3498db"];
            dc.barChart("#citations_year")
                .height(200)
                .margins(margins)
                .width(calculateVisWidth(windowWidth, multiPaper ? 0.42 : 0.85))
                .x(d3.time.scale().domain([d3.time.year(minCitationDate), d3.time.year(maxCitationDate)]))
                .xUnits(d3.time.years)
                .dimension(citationsByYear)
                .group(citationsByYearGroup)
                .colors(citationsColor);

            citationRptLine
                .width(calculateVisWidth(windowWidth, multiPaper ? 0.42 : 0.85))
                .height(200)
                .margins(margins)
                .x(d3.time.scale().domain([minCitationDate, maxCitationDate]))
                .xUnits(d3.time.months)
                .renderHorizontalGridLines(true)
                .dimension(citationsByYear)
                .elasticY(true)
                .elasticX(true)
                .renderVerticalGridLines(true)
                .compose([

                    dc.lineChart(citationRptLine)

                        .group(cumulativeCitationGroup, 'Cumulative Citations')
                        .valueAccessor(function (d) {
                            return d.value;
                        })
                        .colors(citationsColor),

                    dc.barChart(citationRptLine)
                        .group(citationsByYearGroup, 'Citations')
                        .colors(citationsColor)

                ]);

            citationRptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                .brushOn(true);

            createRowChart("#citations_subjects", citationType, citationTypeCount, citationsColor);
            createRowChart("#citations_subject_area", citationSubjectArea, citationSubjectAreaCount, citationsColor);

            createPieChart("#citations_self_cites", selfCitation, selfTypeCount, selfCiteColors);
            createPieChart("#citations_collaboration", citationIsCollaboration, citationIsCollaborationCount, selfCiteColors);

            var detailTable = dc.dataTable('#citations_data_table');
            detailTable.dimension(citationsByDate)
                .group(function (d) {
                    return d.paper_id + ' - ' + d.paper_title;
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