/*
	Kailash Nadh
	http://nadh.in

	November 2012
*/


var Game = new function() {
	this.init = function() {
		initialize();
	};

	// globals
	var prompts = {
		2: "Easy peasy!",
		4: "Not bad, ey?",
		5: "Make it rain!",
		7: "Careful now!",
		8: "Oh oh ...",
		10: "Whew!",
		12: "Make it rain!",
		15: "Watch the speed!",
		18: "You're still here!",
		20: "That's insane :O",
		30: "Don't stop now!",
		40: "You are the ONE",
		50: "Umm ... level 50",
		60: "You're still here!"
	};

	var	RADIUS = 30,
		BORDER = 4,
		FONT_SIZE = 36,
		FPS = 60,
		SCORE_LETTER = 10,
		WORDS_PER_LEVEL = 3,

		round = {
			"elapsed": 0,
			"word_count": 0,
			"pop_count": 0,
			"letter_count": 0,
			"level": 1,
			"score": 0,
			"accuracy": 0,
			"speed": 0			
		}

		words = ["hello"],
		bubbles = {},

		canvas = null,
		stage = null,
		bounds = null,
		sounds = [],
		cur = null,
		start_time = null,
		started = false,

		sound = true,
		tips = false,
		ui = {},
		notice_timer = null;

	// initialization
	function initialize() {
		initUI();

		// load words
		loadWords(round.level);
		nextWord();

		// update ui elements
		updateUI();
	};

	// play/pause the game
	function toggleGame() {
		if(!started) return false;

		if(createjs.Ticker.getPaused()) {
			clearNotice();
			canvas.style.opacity = 1;
			createjs.Ticker.setPaused(false);
		} else {
			createjs.Ticker.setPaused(true);
			canvas.style.opacity = 0;
			permaNotice("Hit Space to unpause");
		}
	}

	// init ui elements
	function initUI() {
		canvas = document.querySelector("#stage");

		// canvas bounds
		bounds = new createjs.Rectangle();

		// set the stage
		stage = new createjs.Stage(canvas);

		ui = {
			"controls": document.querySelector("#controls"),
			"score": document.querySelector("#score"),
			"notice": document.querySelector("#notice"),
			"level": document.querySelector("#level"),
			"words": document.querySelector("#words"),
			"accuracy": document.querySelector("#accuracy"),
			"speed": document.querySelector("#speed"),
			"start_box": document.querySelector("#start"),
			"sound": document.querySelector("#sound"),
			"tips": document.querySelector("#tips"),
			"tip": document.querySelector("#tip")
		};

		// start
		document.querySelector("#btn-start").onclick = function() {
			ui.start_box.remove();

			notice("Prepare to start typing ...");
			window.setTimeout(function() {
				started = true;
				createjs.Ticker.setFPS(FPS);
				createjs.Ticker.addListener(tick, true);

				// keyboard event listener
				document.onkeydown = onKeyPress;
			}, 3000);
		};

		// sound checkbox
		ui.sound.onclick = function() {
			if(this.checked) {
				sound = true;
			} else {
				sound = false;
			}
			localStorage.sound = sound;
		};
		if( typeof localStorage.sound == "undefined" || localStorage.sound == "true") {
			ui.sound.checked = true; sound = true;
		} else {
			ui.sound.checked = false; sound = false;
		}

		// tips checkbox
		ui.tips.onchange = function() {
			ui.tip.innerText = "";
			if(this.checked) {
				tips = true;
			} else {
				tips = false;
			}
			localStorage.tips = tips;
		};
		if( typeof localStorage.tips == "undefined" || localStorage.tips == "false") {
			ui.tips.checked = false; tips = false;
		} else {
			ui.tips.checked = true; tips = true;
		}


		canvas.onclick = function() {
			toggleGame();
		};

		// Multiple sound objects that can be played simultaneously.
		for(var n=0; n<15; n++) {
			var snd = new Audio();
				snd.src = "sounds/pluck." + ( snd.canPlayType("audio/mpeg") ? "mp3" : "ogg" );
			sounds.push(snd);
		}
		sounds.p = 1;

		positionUI();
		window.onresize = positionUI;
	}

	// position ui elements
	function positionUI() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		bounds.width = canvas.width;
		bounds.height = canvas.height;

		RADIUS = Math.ceil(canvas.width * 0.019);
		FONT_SIZE = Math.ceil(canvas.width * 0.022);
		BORDER = RADIUS * .13;
	}

	// show a permanent notice
	function permaNotice(msg) {
		window.clearTimeout(notice_timer);
		ui.notice.innerText = msg;
		ui.notice.style.display = "block";
	}
	// hide notice
	function clearNotice(msg) {
		ui.notice.style.display = "none";
	}

	// show a delayed
	function delayedNotice(msg, delay) {
		window.setTimeout(function() {
			notice(msg);
		}, delay*1000);
	}

	// show a notice
	function notice(msg) {
		window.clearTimeout(notice_timer);

		ui.notice.innerText = msg;
		ui.notice.style.display = "block";
		
		notice_timer = window.setTimeout(function() {
			ui.notice.style.display = "none";
		}, 3000)
	}

	// play a sound
	function playSound(s) {
		if(!sound) return;

		sounds[sounds.p-1].pause();
		sounds[sounds.p-1].load();
		sounds[sounds.p].play();

		if(sounds.p >= sounds.length-1) {
			sounds.p = 1;
		} else {
			sounds.p++;
		}
	}

	// update ui elements
	function updateUI() {
		ui.level.innerText = round.level;
		ui.score.innerText = round.score;
		ui.words.innerText = round.pop_count;
		ui.accuracy.innerText =  ((round.accuracy / round.word_count) * 100).toFixed(1) + "%";

		var wpm = (( Math.round((round.letter_count/5), 0) / round.elapsed) * 60).toFixed(2);
		round.speed = wpm*1 == wpm ? wpm : 0;
		ui.speed.innerText = round.speed;
	}

	// level goes up
	function levelUp() {
		round.level++;
		notice("Level " + round.level);
		updateUI();
		loadWords(round.level);
	}

	// create a word and render it
	function renderWord(word) {
		word = word.toUpperCase();

		var g = new createjs.Graphics();

		// draw the circle
		g.setStrokeStyle(BORDER);
		g.beginStroke("#333333");
		g.drawCircle(0,0, RADIUS);


		var x = 100, set = [];
		for(var n=0; n<word.length; n++) {
			var bubble = new createjs.Container(),
				circle = new createjs.Shape(g),
				letter = new createjs.Text(word[n] == " " ? "_" : word[n], FONT_SIZE + "px Arial", "#333333");

			letter.textBaseline = "middle";
			letter.textAlign = "center";

			bubble.addChild(circle);
			bubble.addChild(letter);
			bubble.char = word[n];
			bubble.temp_x = x;
			bubble.y = 10;
			bubble.speed = random((round.level / 5) + 1, (round.level / 5) + 3); // initial speed

			set.push(bubble);
			stage.addChild(bubble);
			x+= RADIUS + random( RADIUS+10, RADIUS*2 + 20);
		}

		for(var n=0; n<set.length; n++) {
			var bubble = set[n];
			bubble.x = bubble.temp_x + ( (canvas.width - x) / 2);
		}

		set.pointer = 0; // character pointer
		set.deleted = 0; // deleted chars
		set.bad = 0; // bad keypresses
		
		bubbles[word] = set;
		cur = word;
		round.word_count++;

		// level goes up
		if(round.word_count % WORDS_PER_LEVEL == 0) {
			levelUp();
		}

		markStart();
	};

	// render the upcoming word
	function renderTip(word) {
		if(!tips || round.word_count == 1) return;
		ui.tip.innerText = word;
	}

	// createjs ticker
	function tick() {
		for(var word in bubbles) {
			if(!bubbles.hasOwnProperty(word)) continue;

			// go through all bubbles in the queue and animate them
			for(var n=0; n<bubbles[word].length; n++) {
				if(!bubbles[word][n]) continue;

				var bubble = bubbles[word][n];
				if(bubble.y - RADIUS > bounds.height) { // if a bubble's crossed the Y boundary, kill it
					bubbles[word].deleted++;
					stage.removeChild(bubbles[word][n]);
					delete bubbles[word][n];
				} else {
					bubble.y += bubble.speed;
				}
			}

			// wipe out a fallen word completely
			if(bubbles[word].deleted == bubbles[word].length) {
				var popped = bubbles[cur].pointer >= bubbles[cur].length;
				delete bubbles[word];
				deleted(popped);
			}
		}

		stage.update();
	};

	// load words from the dictionary
	function loadWords(level) {
		if(level == 1) {
			words = THESAURUS.three;
		} else if(level == 3) {
			words = THESAURUS.small;
		} else if(level == 5) {
			words = THESAURUS.medium;
		} else if(level == 8) {
			words = THESAURUS.large;
		} else if(level == 10) {
			words = THESAURUS.big;
		} else if(level == 14) {
			words = THESAURUS.medium;
		} else if(words.length < 2) {
			words = THESAURUS.medium;
		}

		if(prompts.hasOwnProperty(level)) {
			delayedNotice(prompts[level], 5);
		}

		words = shuffle(words);
		words.index = 0;
	}

	// up the next word in the queue
	function nextWord() {
		renderWord(words[words.index]);
		words.index = words.index+1 >= words.length ? 0 : words.index+1;
		renderTip(words[words.index]);
	}

	// starttime of a word's creation
	function markStart() {
		start_time = microtime();
	}

	// note elapsed time
	function elapsed() {
		round.elapsed += (microtime() - start_time);
	}

	// successful pop of a word
	function score(word) {
		// successful pop of a word
		var score = word.length * (tips ? SCORE_LETTER/2 : SCORE_LETTER);
		round.letter_count+= word.length;
		round.pop_count++;

		elapsed();

		round.score += score;
	};

	// a single character's been popped
	function popOne(c) {
		playSound("pop");
	}

	// a word's been successfully popped by the user
	function popped(word) {
		score(word);
		round.accuracy += 1;
		updateUI();
	};

	// incorrect keypress
	function badKey() {
		bubbles[cur].bad++;
		round.accuracy -= (bubbles[cur].bad / bubbles[cur].length);
	};

	// a word's just been deleted off the screen
	function deleted(popped) {
		if(!popped) { // missed a word
			round.accuracy -= 1;
			elapsed();
		}

		updateUI();
		nextWord();
	};

	// keyboard listener
	function onKeyPress(e) {
		// space key
		if(e.keyCode == 32) {
			e.preventDefault();
			toggleGame();
			return;
		}

		if(e.keyCode < 65 || e.keyCode > 91 || e.ctrlKey || e.AltKey) {
			return;
		}

		if(!createjs.Ticker.getPaused()) {
			e.preventDefault();
		}

		if(!cur || !bubbles[cur] || createjs.Ticker.getPaused()) return;

		var c = String.fromCharCode(e.keyCode).toUpperCase(),
			p = bubbles[cur].pointer;

		if(!bubbles[cur][p]) {
			return;
		}
		if( bubbles[cur][p].char == c) {	// correct keypress
			bubbles[cur][p].speed = 30;
			bubbles[cur].pointer++;
			popOne(c);
		} else { // incorrect keypress
			badKey();
		}

		if(bubbles[cur].pointer >= bubbles[cur].length) {
			popped(cur);
		}
	}

	// get a random number betwen min and max
	function random(min, max) {
		return Math.floor( Math.random(new Date().getTime()) * (max - min) + min, 0 );
	}

	function shuffle(o) {
		for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	}

	function microtime(get_as_float) {
		var unixtime_ms = new Date().getTime();
		var sec = parseInt(unixtime_ms / 1000);
		return (unixtime_ms/1000);
	}
}

document.addEventListener("DOMContentLoaded", function() {
	Game.init();
}, false);
