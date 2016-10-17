var citesummary_vis = (function () {

    var self_cite_colors = d3.scale.ordinal().domain(["self", "not self"]).range(["#3498db", "#e74c3c"]);
    var subject_area_colors = d3.scale.ordinal().range(["#95a5a6", "#7f8c8d", "#34495e", "#8e44ad"]);
    var citation_type_colors = d3.scale.ordinal().domain(["preprint", "article"]).range(["#3498db", "#2980b9"]);
    var date_format = "%d %b %Y";

    var formatNumber = d3.format(",d"),
        formatDate = d3.time.format(date_format),
        formatTime = d3.time.format("%I:%M %p"),
        normalised_number_format = d3.format("s");

    var parseDate = function (d) {
        return new Date(d.substring(0, 4),
            d.substring(5, 7),
            d.substring(8));
    };

    var sortByDateAscending = function (a, b) {

        if (typeof a === 'string') {
            a = d3.time.format(date_format).parse(a);
            b = d3.time.format(date_format).parse(b);
            return b - a;
        } else {
            return b.citation_date - a.citation_date;
        }

    };

    var calculate_window_width = function () {
        return $(window).width();
    };

    var calculate_vis_width = function (window_width, normal_width_ratio) {
        if (window_width <= 900) {
            return window_width * 0.63;
        } else {
            return window_width * normal_width_ratio;
        }
    };

    var process_data = function (data) {
        /*
         Parses the data fields
         */

        var flattened = flatten_json(data);
        console.log(flattened);
        flattened.forEach(function (d, i) {
            d.index = i;
            d.paper_date = parseDate(d.paper_date);
            d.citation_date = parseDate(d.citation_date);
        });

        return flattened;
    };

    var flatten_json = function (data) {
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
                var _citation_record = $.extend({}, _record);

                Object.keys(d).forEach(function (k) {
                    if (k !== 'citations')
                        _citation_record['citation_' + k] = d[k];
                });

                flattened.push(_citation_record);
            });

        });

        return flattened;

    };

    return {
        render: function (data) {

            var citation_data = process_data(data);

            var observed_papers = [];

            var papers = crossfilter(citation_data),

                citations_by_date = papers.dimension(function (d) {
                    return d.citation_date;
                }),

                citation_type = papers.dimension(function (d) {
                    return d.citation_document_type;
                }),

                self_citation = papers.dimension(function (d) {
                    return d.citation_selfcite ? "self" : "not self";
                }),

                subject_area = papers.dimension(function (d) {
                    return d.citation_subject;
                }),

                citation_count_group = citations_by_date.group();

            var citation_type_count = citation_type.group(),

                self_type_count = self_citation.group(),


                subject_area_count = subject_area.group();

            var top_value = 0;
            var cumulative_citation_group = {
                all: function () {
                    var cumulate = 0;
                    var g = [];
                    citation_count_group.all().forEach(function (d, i) {
                        cumulate += d.value;
                        top_value = cumulate;
                        g.push({
                            key: d.key,
                            value: cumulate,
                            single_value: d.value
                        });
                    });
                    return g;
                }
            };

            //var minCitationDate = new Date(citations_by_date.bottom(1)[0].citation_date);
            //var maxCitationDate = new Date(citations_by_date.top(1)[0].citation_date);

            var minPaperDate = new Date(citations_by_date.bottom(1)[0].citation_date);
            var maxPaperDate = new Date(citations_by_date.top(1)[0].citation_date);

            //var minDate = minCitationDate < minPaperDate ? minCitationDate : minPaperDate;
            //var maxDate = maxCitationDate > maxPaperDate ? maxCitationDate : maxPaperDate;
            var minDate = minPaperDate;
            var maxDate = maxPaperDate;
            minDate.setDate(minDate.getDate() - 30);
            maxDate.setDate(maxDate.getDate() + 30);


            var window_width = calculate_window_width();
            var rptLine = dc.compositeChart(document.getElementById("citations"));

            rptLine
                .width(calculate_vis_width(window_width, 0.85))
                .height(300)
                .margins({top: 10, right: 50, bottom: 30, left: 60})
                .x(d3.time.scale().domain([minDate, maxDate]))
                .xUnits(d3.time.months)
                .renderHorizontalGridLines(true)
                .dimension(citations_by_date)
                .renderVerticalGridLines(true)
                .compose([
                    dc.lineChart(rptLine)

                        .group(cumulative_citation_group, 'Cumulative Citations')
                        .valueAccessor(function (d) {
                            return d.value;
                        })
                        .colors(['#2980b9']),

                    dc.barChart(rptLine)
                        .group(citation_count_group, 'Citations')
                        .colors(['#3498db'])

                ]);

            rptLine.legend(dc.legend().x(80).y(20).itemHeight(13).gap(5))
                .brushOn(true);

            dc.pieChart("#citation_subjects")
                .dimension(citation_type)
                .group(citation_type_count)
                .colors(citation_type_colors);

            dc.pieChart("#self_cites")
                .dimension(self_citation)
                .group(self_type_count)
                .colors(self_cite_colors);

            dc.pieChart("#subject_area")
                .dimension(subject_area)
                .group(subject_area_count)
                .colors(subject_area_colors);


            var detailTable = dc.dataTable('#data_table');
            detailTable.dimension(citations_by_date)
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