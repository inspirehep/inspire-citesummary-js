
(function (angular) {


    function citeSummary() {

        var controller = ["$scope", "CiteSummaryService",
            function ($scope, CiteSummaryService) {
                $scope.vm = {};
                $scope.vm.loading = true;
                $scope.vm.searchTerm = null;
                $scope.vm.showRelated = false;

                CiteSummaryService.load($scope.apiEndpoint).then(function (result) {
                    $scope.vm.data = result;

                    setTimeout(function () {
                        citesummary_vis.render($scope.vm.data);
                    }, 0);
                });

            }
        ];

        function templateUrl(element, attrs) {
            return attrs.template;
        }

        return {
            templateUrl: templateUrl,
            restrict: 'AE',
            scope: {
                apiEndpoint: '@apiEndpoint'
            },
            controller: controller
        };
    }

    angular.module('citeSummary.directives', [])
        .directive('citeSummary', citeSummary);

})(angular);
