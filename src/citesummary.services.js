
(function (angular) {
    /**
     * HoldingPenRecordService allows for the getting, update and resolution of
     * workflow records.
     */
    angular.module('citeSummary.services', [])
        .factory("CiteSummaryService", ["$http",
                function ($http) {
                    return {

                        load: function (apiEndpoint) {
                            return $http.get(apiEndpoint).then(function (response) {
                                console.debug(response.data);
                                return response.data;
                            }).catch(function (value) {
                                console.error('cannot fetch content from ' + apiEndpoint, value);
                                return {};
                            });
                        }
                    };
                }
            ]
        )
    ;
}(angular));
