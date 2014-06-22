function RepositoryController($q, $scope, $location, $timeout, ConfirmDialogService, AlertService, AceEditorService) {
	// registered repositories
	$scope.repositories = [];
	$scope.snapshots = [];
	$scope.indices = [];
	
	$scope.snapshot = null;
	$scope.snapshot_repository = '';

	$scope.restorable_indices = [];
	$scope.new_repo = {};
	$scope.new_snap = {};
	$scope.restore_snap = {};
	$scope.editor = undefined;
	
	$scope.$on('loadRepositoryEvent', function() {
		$scope.initEditor();
		$scope.snapshot = null; // clear 'active' snapshot
		$scope.reload();
	});
	
	$scope.initEditor=function() {
		if (!isDefined($scope.editor)) {
			$scope.editor = AceEditorService.init('repository-settings-editor');
		}
	};

	$scope.reload=function(){
		$scope.loadIndices();
		$scope.loadRepositories();
		if (notEmpty($scope.snapshot_repository)) {
			$scope.fetchSnapshots($scope.snapshot_repository);
		}
	};
	
	$scope.loadIndices=function() {
		if (isDefined($scope.cluster)) {
			$scope.indices = $scope.cluster.indices || [];
		}
	}

	$scope.optionalParam=function(body, object, paramname){
		if(angular.isDefined(object[paramname])) {
			body[paramname] = object[paramname];
		}
		return body;
	};

	$scope.deleteRepository=function(repository){
		ConfirmDialogService.open(
			"are you sure you want to delete repository " + repository.name + "?",
			repository.settings,
			"Delete",
			function() {
				$scope.client.deleteRepository(repository.name,
					function(response) {
						AlertService.success("Repository successfully deleted", response);
						$scope.reload();
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while deleting repositor", error);
						});
					}
				);
			}
		);
	};

	$scope.restoreSnapshot=function() {
		var body = {}
		// dont add to body if not present, these are optional, all indices included by default
		if (angular.isDefined($scope.restore_snap.indices) && $scope.restore_snap.indices.length > 0) {
			body["indices"] = $scope.restore_snap.indices.join(",");
		}

		if (angular.isDefined($scope.restore_snap.include_global_state)) {
			//TODO : when fixed [https://github.com/elasticsearch/elasticsearch/issues/4949], this extra "true/false" -> true/false handling will go away
			body["include_global_state"] = ($scope.restore_snap.include_global_state == 'true');
		}

		$scope.optionalParam(body, $scope.restore_snap, "ignore_unavailable");
		$scope.optionalParam(body, $scope.restore_snap, "rename_replacement");
		$scope.optionalParam(body, $scope.restore_snap, "rename_pattern");

		$scope.client.restoreSnapshot($scope.snapshot_repository, $scope.snapshot.name, JSON.stringify(body),
			function(response) {
				AlertService.success("Snapshot Restored Started");
				$scope.reload();
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while started restore of snapshot", error);
				});
			}
		);
	};

	$scope.createRepository=function(){
		$scope.new_repo.settings = $scope.editor.format();
		if ($scope.editor.error === null) {
			var body = {
				type: $scope.new_repo.type,
				settings: JSON.parse($scope.new_repo.settings)
			}
			$scope.client.createRepository($scope.new_repo.name, JSON.stringify(body),
				function(response) {
					AlertService.success("Repository created");
					$scope.loadRepositories();
				},
				function(error) {
					$scope.updateModel(function() {
						AlertService.error("Error while creating repository", error);
					});
				}
			);
		}
	};

	$scope.loadRepositories=function() {
		$scope.client.getRepositories(
			function(response) {
				$scope.updateModel(function() {
					$scope.repositories = response;
				});
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while reading repositories", error);
				});
			}
		);
	};

	$scope.createSnapshot=function(){
		var body = {}

		// name and repo required
		if (!isDefined($scope.new_snap.repository)) {
			AlertService.warn("Repository is required");
			return
		}

		if (!isDefined($scope.new_snap.name)) {
			AlertService.warn("Snapshot name is required");
			return
		}

		// dont add to body if not present, these are optional, all indices included by default
		if (angular.isDefined($scope.new_snap.indices) && $scope.new_snap.indices.length > 0) {
			body["indices"] = $scope.new_snap.indices.join(",");
		}

		if(angular.isDefined($scope.new_snap.include_global_state))
		{
			//TODO : when es fixes bug [https://github.com/elasticsearch/elasticsearch/issues/4949], this extra "true/false" -> true/false handling will go away
			body["include_global_state"] = ($scope.new_snap.include_global_state == 'true');
		}
		
		$scope.optionalParam(body, $scope.new_snap, "ignore_unavailable");

		$scope.client.createSnapshot($scope.new_snap.repository.name, $scope.new_snap.name, JSON.stringify(body),
			function(response) {
				AlertService.success("Snapshot created");
				$scope.reload();
			},
			function(error) {
				$scope.updateModel(function() {
					AlertService.error("Error while creating snapshot", error);
				});
			}
		);
	};

	$scope.deleteSnapshot=function(snapshot){
			ConfirmDialogService.open(
			"are you sure you want to delete snapshot " + snapshot.name + "?",
			snapshot,
			"Delete",
			function() {
				$scope.client.deleteSnapshot(
					snapshot.repository,
					snapshot.snapshot,
					function(response) {
						AlertService.success("Snapshot successfully deleted", response);
						$scope.reload();
					},
					function(error) {
						$scope.updateModel(function() {
							AlertService.error("Error while deleting snapshot", error);
						});
					}
				);
			}
		);
	};

	$scope.fetchSnapshots=function(repository) {
		$scope.client.getSnapshots(repository,
			function(response) {
				$scope.updateModel(function() {
					$scope.snapshots = response;
				});
			},
			function(error) {
				$scope.updateModel(function() {
					$scope.snapshots = [];
					AlertService.error("Error while fetching snapshots", error);
				});
			}
		);
	};

	$scope.selectSnapshot=function(snapshot) {
		$scope.snapshot = snapshot;
	}
	
	$scope.unselectSnapshot=function() {
		$scope.snapshot = null;
	}
	
	$scope.selectRepository=function(repository) {
		$scope.snapshot_repository = repository;
		$scope.fetchSnapshots(repository);
	}
}
