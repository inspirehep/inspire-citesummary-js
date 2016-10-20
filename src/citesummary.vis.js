var citeSummaryVis = (function () {

    var selfCiteColors = d3.scale.ordinal().domain(["Self", "Not Self"]).range(["#3498db", "#e74c3c"]);
    var collaborationColors = d3.scale.ordinal().domain(["Other", "Collaboration Paper"]).range(["#95a5a6", "#ecf0f1"]);
    var dateFormat = "%d %b %Y";
    var zero_count = 0;

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
        "Relativistic": "Experiment-HEP",
        "Electroweak": "General Physics",
        "Accelerators": "Accelerators",
        "Field Theory": "Lattice",
        "Cosmology": "Astrophysics",
        "Elementary Particles": "General Physics"
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

    var createRowChart = function (placement, dimension, group, colors) {
        var chart = dc.rowChart(placement)
            .dimension(dimension)
            .height(360)
            .width(300)
            .group(group)
            .colors(colors);

        chart.xAxis().ticks(5);
        chart.xAxis().tickFormat(normalisedNumberFormat);
        chart.ordering(function (d) {
            return -d.value;
        });
    };

    var createPieChart = function (placement, dimension, group, colors) {
        var pieChart = dc.pieChart(placement)
            .dimension(dimension)
            .radius(60)
            .cx(80)
            .cy(60)
            .innerRadius(40)
            .group(group)
            .colors(colors)
            .legend(dc.legend2().x(170).y(0).itemHeight(12).gap(5).horizontal(1).legendWidth(90).itemWidth(95).showPercent(true));

        pieChart.ordering(function (d) {
            return -d.value;
        });

    };

    var reduceAdd = function (p, v) {

        if (!(v.paper_id in p.observedPapers)) {
            p.observedPapers[v.paper_id] = 1;
            p.paperCount++;
        } else {
            p.observedPapers[v.paper_id]++;
        }
        return p;
    };

    var reduceRemove = function (p, v) {
        p.observedPapers[v.paper_id]--;
        if (p.observedPapers[v.paper_id] === 0) {
            delete p.observedPapers[v.paper_id];
            p.paperCount--;
        }
        return p;

    };

    var reduceInit = function () {
        return {
            paperCount: 0,
            observedPapers: {}
        };
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
                    Object.keys(cleanupMapping).forEach(function (k) {
                        if (subject.indexOf(k) != -1) {
                            d[s + '_subject'] = cleanupMapping[k];
                            return;
                        }
                    });
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

            _record.paper_citation_count = d.citations.length;

            if (d.citations.length > 0) {
                d.citations.forEach(function (d) {
                    var _citationRecord = $.extend({}, _record);

                    Object.keys(d).forEach(function (k) {
                        if (k !== 'citations')
                            _citationRecord['citation_' + k] = d[k];
                    });

                    flattened.push(_citationRecord);
                });
            } else {
                zero_count++;
            }

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
                    return d.citation_selfcite ? "Self" : "Not Self";
                }),

                citationIsCollaboration = papers.dimension(function (d) {
                    return d.citation_collaboration ? "Collaboration Paper" : "Other";
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
                paperCitations = papers.dimension(function (d) {
                    return d.paper_citation_count;
                }),
                paperSubjectArea = papers.dimension(function (d) {
                    return d.paper_subject;
                });

            var papersCountGroup = papersByYear.group().reduce(reduceAdd, reduceRemove, reduceInit);
            var papersCitationGroup = paperCitations.group().reduce(reduceAdd, reduceRemove, reduceInit);

            var paperTypeCount = paperType.group(),
                paperSubjectAreaCount = paperSubjectArea.group();

            var citationsByYearGroup = citationsByYear.group(),
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
                    papersCountGroup.all().forEach(function (d) {
                        cumulate += d.value.paperCount;
                        g.push({
                            key: d.key,
                            value: cumulate,
                            single_value: d.value.paperCount
                        });
                    });
                    return g;
                }
            };


            var windowWidth = calculateWindowWidth();
            var allCitations = papers.groupAll();

            // Updated version
            dc.dataCount("#citations_summary")
                .dimension(papers)
                .group(allCitations);

            var allPapers = papers.groupAll();

            var observedPapers = {};
            allPapers.reduce(function (p, v) {
                    if (!(v.paper_id in observedPapers)) {
                        observedPapers[v.paper_id] = 1;
                        p++;
                    } else {
                        observedPapers[v.paper_id]++;
                    }
                    return p;
                }, function (p, v) {
                    observedPapers[v.paper_id]--;
                    if (observedPapers[v.paper_id] === 0) {
                        delete observedPapers[v.paper_id];
                        p--;
                    }
                    return p;
                }
                , function () {
                    return 0;
                });

            dc.dataCount("#papers_summary")
                .dimension(papers)
                .group(allPapers)
                .valueAccessor(function (d) {
                    console.log(d);
                    return d.paperCount;
                });

            var margins = {top: 20, right: 20, bottom: 20, left: 40};
            if (multiPaper) {

                var minPaperDate = new Date(papersByDate.bottom(1)[0].paper_date);
                var maxPaperDate = new Date(papersByDate.top(1)[0].paper_date);

                minPaperDate.setDate(minPaperDate.getDate() - 30);
                maxPaperDate.setDate(maxPaperDate.getDate() + 30);

                var papersColor = "#95a5a6";

                var papersRptLine = dc.compositeChart(document.getElementById("papers"));

                papersRptLine
                    .width(calculateVisWidth(windowWidth, multiPaper ? 0.42 : 0.85))
                    .height(150)
                    .margins(margins)
                    .dimension(papersByYear)
                    .x(d3.time.scale().domain([minPaperDate, maxPaperDate]))
                    .xUnits(d3.time.years)
                    .xAxisLabel('Publication Year')
                    .yAxisLabel('# Papers')

                    .renderHorizontalGridLines(true)
                    .renderVerticalGridLines(true)
                    .compose([

                        dc.lineChart(papersRptLine)
                            .dimension(papersByYear)
                            .group(cumulativePaperGroup, 'Cumulative Papers')
                            .valueAccessor(function (d) {
                                return d.value;
                            })
                            .colors(papersColor),

                        dc.barChart(papersRptLine)
                            .dimension(papersByYear)
                            .group(cumulativePaperGroup, 'Papers')
                            .x(d3.time.scale().domain([minPaperDate, maxPaperDate]))
                            .xUnits(d3.time.years)
                            .valueAccessor(function (d) {
                                return d.single_value;
                            })
                            .colors(papersColor)

                    ]);

                papersRptLine.yAxis().tickFormat(normalisedNumberFormat)

                papersRptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                    .brushOn(true);

                createRowChart("#papers_document_type", paperType, paperTypeCount, papersColor);
                createRowChart("#papers_subject_area", paperSubjectArea, paperSubjectAreaCount, papersColor);

                var citationExtent = [paperCitations.bottom(1)[0].paper_citation_count, paperCitations.top(1)[0].paper_citation_count];
                var paperCitationCount = dc.barChart("#papers_citation_count")
                    .width(600)
                    .height(150)
                    .dimension(paperCitations)
                    .group(papersCitationGroup, 'Papers')
                    .valueAccessor(function (d) {
                        return d.value.paperCount;
                    })
                    .x(d3.scale.linear().domain([citationExtent[0] - 1, citationExtent[1] + 1]))
                    .xAxisLabel('# Citations')
                    .yAxisLabel('# Papers')
                    .colors(papersColor);

                paperCitationCount.xAxis().tickFormat(normalisedNumberFormat)

            }


            var citationRptLine = dc.compositeChart(document.getElementById("citations"));

            var minCitationDate = new Date(citationsByDate.bottom(1)[0].citation_date);
            var maxCitationDate = new Date(citationsByDate.top(1)[0].citation_date);

            minCitationDate.setDate(minCitationDate.getDate() - 30);
            maxCitationDate.setDate(maxCitationDate.getDate() + 30);

            var citationsColor = "#3498db";

            citationRptLine
                .width(calculateVisWidth(windowWidth, multiPaper ? 0.42 : 0.85))
                .height(150)
                .margins(margins)
                .x(d3.time.scale().domain([minCitationDate, maxCitationDate]))
                .xUnits(d3.time.years)
                .xAxisLabel('Citation Year')
                .yAxisLabel('# Citations')

                .renderHorizontalGridLines(true)
                .dimension(citationsByYear)
                .renderVerticalGridLines(true)
                .compose([

                    dc.lineChart(citationRptLine)
                        .dimension(citationsByYear)
                        .group(cumulativeCitationGroup, 'Cumulative Citations')
                        .valueAccessor(function (d) {
                            return d.value;
                        })
                        .colors(citationsColor),

                    dc.barChart(citationRptLine)
                        .dimension(citationsByYear)
                        .group(citationsByYearGroup, 'Citations')
                        .colors(citationsColor)

                ]);

            citationRptLine.yAxis().tickFormat(normalisedNumberFormat);

            citationRptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                .brushOn(true);

            createRowChart("#citations_subjects", citationType, citationTypeCount, citationsColor);
            createRowChart("#citations_subject_area", citationSubjectArea, citationSubjectAreaCount, citationsColor);

            createPieChart("#citations_self_cites", selfCitation, selfTypeCount, selfCiteColors);
            createPieChart("#citations_collaboration", citationIsCollaboration, citationIsCollaborationCount, collaborationColors);

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
                        return '<span class="label label-info">Cited on ' + formatDate(d.citation_date) + '</span>';
                    },

                    function (d) {
                        return '<span class="label ' + (d.citation_selfcite ? "label-danger" : "label-default") + '">' + (d.citation_selfcite ? " Self Citation" : "") + '</span> ' +
                            '<a href="/record/' + d.citation_id + '" target="_blank"><strong>' + d.citation_id + '</strong> ' + d.citation_title + '</a>';
                    },

                    function (d) {
                        return d.citation_document_type;
                    },
                    function (d) {
                        return d.citation_subject;
                    }
                ]).sortBy(function (d) {
                    return d.citation_date;
                })
                .order(sortByDateAscending);

            dc.renderAll();

            d3.select("#papers_summary .total-papers").text(data.length);
            if (zero_count > 0) {
                d3.select("#papers_summary .zero-papers").classed("hidden", false);
                d3.select("#papers_summary .zero-papers .count").text(zero_count);
            }

            d3.select("#spinner").classed("hidden", true);
            d3.select("#contents").classed("hidden", false);

        }
    };

})();