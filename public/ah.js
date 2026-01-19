/*
// antiHack

// crazy debugging mode

		setInterval(function(){
			check();
		}, 2000);
		var check = function(){
			function doCheck(a){
				if (('' + a / a)['length'] !== 1 || a % 20 === 0){
				
					(function() {}['constructor']('debugger')());
				} else {
					(function() {}['constructor']('debugger')());
				}
				doCheck(++a);
			}
			try {
				doCheck(0);
			}catch(err){}
		};
		check();
		
			function consoleOpenCallback() {
			alert('goldenbody never destroys, goldenbody breaks control, goldenbody breaks illusions. (CLOSE THE DEBUGGER!!!)');
			window.close();
		}

			var Anti_numtots = 0;
		(function () {
			window._windon_handler = setInterval( function() {
				var before = new Date();
				debugger;
				var after = new Date();
				if (after.getTime() - before.getTime() > 100) {
					if (after.getTime() - before.getTime() > 2000) {
						consoleOpenCallback();
						clearInterval(_windon_handler);
					}else{
						Anti_numtots++;
						if(Anti_numtots>=2){
							consoleOpenCallback();
							clearInterval(_windon_handler);
						}
					}
				}else{
					Anti_numtots = 0;
				}
			}, 1000)
		})();
		*/