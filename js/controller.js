function ThreeJsCtrl($scope) {

	$scope.gcode = "g0 x10 y10 z10\ng0 z-10\ng0 x30\n";

	$scope.Mill1 = function() {
		  scene.mill1AndPaint();
	}

	$scope.Mill2 = function() {
		  scene.mill2AndPaint();
	}

	$scope.Mill3 = function() {
		  scene.mill3AndPaint();
	}
    
}


