// Game constructor
var JSChess = function (playerColor) {

	// Board state
	var state = [
		[3,5,4,2,1,4,5,3],
		[6,6,6,6,6,6,6,6],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0],
		[6,6,6,6,6,6,6,6],
		[3,5,4,2,1,4,5,3]
	];

	// Defaults to white
	var colors =  ['white', 'black'];
	var turn = true;

	// Generic board loops
	var loopRows = function (callback) { for (var y = 0; y < 8; y++) callback(y); };
	var loopSpaces = function (callback) { loopRows(function (y) { for (var x = 0; x < 8; x++) callback(x, y); }); };

	// Helper functions
	var pieceAt = function (x, y) { return (!!state[y][x]) ? state[y][x] : false; };
	var friendly = function (piece, piece2) { return (piece.color == piece2.color); };
	var toggleTurn = function () { turn = !!turn; };
	var approve = function (piece) { piece.unmoved = false; return piece; };
	var rotate = function () {
		// Rotate the board orientation
		colors = colors.reverse();
		loopRows(function (y) {
			state[y] = state[y].reverse();
		});
		state.reverse();
	};
	var pathClear = function (x, y, dir, dist) {
		// Check for obstructions to linear movements
		var paths = {};
		for (var d = 1; d < dist; d++) {
			paths = {
				u: [x, y - d],
				d: [x, y + d],
				l: [x - d, y],
				r: [x + d, y],
				ul: [x - d, y - d],
				dl: [x - d, y + d],
				ur: [x + d, y - d],
				dr: [x + d, y + d]
			};
			if (!!pieceAt(paths[dir][0], paths[dir][1])) return false;
		};
		return approve(pieceAt(x, y));
	};

	// Chess piece interface
	var ChessPiece = function (pieceType, color) {
		// Generic piece constructor
		return {
			type: pieceType,
			color: color,
			name: pieces[pieceType-1][0],
			move: pieces[pieceType-1][1],
			unmoved: true
		};
	};

	// Piece movement definitions
	var pieces = [
		['king', function (x, y, x2, y2) {
			var piece = pieceAt(x, y);
			var ydist = Math.abs(y - y2);
			var xdist = Math.abs(x - x2);
			if (xdist == ydist && xdist == 1 || xdist == 1 && ydist == 0 || xdist == 0 && ydist == 1) return approve(piece);
			return false;
		}],
		['queen', function (x, y, x2, y2) {
			// Reusing rook & bishop move validation
			// If rook or bishop can make move, so can queen
			if (!!pieces[2][1](x, y, x2, y2) || !!pieces[3][1](x, y, x2, y2)) return approve(pieceAt(x, y));
			return false;
		}],
		['rook', function (x, y, x2, y2) {
			var piece = pieceAt(x, y);
			var ydist = Math.abs(y - y2);
			var xdist = Math.abs(x - x2);
			if (x == x2) {
				// Vertical move
				if (y - y2 > 0) return pathClear(x, y, "u", ydist);
				if (y - y2 < 0) return pathClear(x, y, "d", ydist);
			} else if (y == y2) {
				// Horizontal move
				if (x - x2 > 0) return pathClear(x, y, "l", xdist);
				if (x - x2 < 0) return pathClear(x, y, "r", xdist);
			}
			return false;
		}],
		['bishop', function (x, y, x2, y2) {
			var piece = pieceAt(x, y);
			var ydist = Math.abs(y - y2);
			var xdist = Math.abs(x - x2);
			if (y != y2 && x != x2 && xdist == ydist) {
				if (x - x2 > 0) {
					// Leftward move
					if (y - y2 > 0) return pathClear(x, y, "ul", ydist);
					if (y - y2 < 0) return pathClear(x, y, "dl", ydist);
				} else if (x - x2 < 0) {
					// Rightward move
					if (y - y2 > 0) return pathClear(x, y, "ur", ydist);
					if (y - y2 < 0) return pathClear(x, y, "dr", ydist);
				}
			}
			return false;
		}],
		['knight', function (x, y, x2, y2) {
			var piece = pieceAt(x, y);
			var ydist = Math.abs(y - y2);
			var xdist = Math.abs(x - x2);
			if (xdist == 1 && ydist == 2 || xdist == 2 & ydist == 1) return approve(piece);
			return false;
		}],
		['pawn', function (x, y, x2, y2) {
			// The pawn is the least valuable and the most complex
			var piece = pieceAt(x, y);
			var dest = pieceAt(x2, y2);
			var ydist = y - y2;
			var xdist = Math.abs(x - x2);
			var passant = pieceAt(x2, y2 + 1);
			// TODO: promotion logic, disabling en passant
			if ((x == x2 && !pieceAt(x, y - 1) && !dest) && (ydist == 1 || ydist == 2 && piece.unmoved)) {
				// Upward move
				if (ydist == 2) piece.enpass = true;
				return approve(piece);
			} else if (ydist == 1 && xdist == 1) {
				// Diagnonal move (attack)
				if (!!dest && !friendly(piece, dest)) return approve(piece);
				// En passant (attack)
				if (!dest && !!passant.enpass && !friendly(piece, passant)) {
					state[y2 + 1][x2] = 0;
					return approve(piece);
				}
			}
			return false;
		}]
	];

	// Move chess piece
	var move = function (x, y, x2, y2) {
		// x,y to x2,y2
		var piece = pieceAt(x, y);
		var dest = pieceAt(x2, y2);
		if (!!piece && !(x == x2 && y == y2) && (!dest || !friendly(piece, dest))) {
			var approved = piece.move(x, y, x2, y2);
			if (!!approved) {
				state[y2][x2] = approved;
				state[y][x] = 0;
				toggleTurn();
				rotate();
				draw();
				return true;
			}
		}
		return false;
	};

	// Output current state
	var draw = function () {
		document.getElementById("board").innerHTML = "";
		loopSpaces(function (x, y) {
			var symbol = "",
				piece = pieceAt(x, y);
			if (!!piece) {
				symbol = "&#" + ((piece.color == 'black') ? 9817 + piece.type : 9811 + piece.type) + ";";
			}
			document.getElementById("board").innerHTML += "<div>" + symbol + "</div>";
		});
	};

	// Prepare and draw board
	var setup = (function () {
		if (playerColor == 'black') {
			turn = !turn;
			rotate();
		}
		loopSpaces(function (x, y) {
			var piece = pieceAt(x, y);
			if (!!piece) state[y][x] = ChessPiece(piece, (y < 2) ? colors[1] : colors[0]);
		});
		draw();
	})();

	// Public board methods
	return {
		color: playerColor,
		move: move,
		pieceAt: pieceAt,
		rotate: function () { rotate(); this.rotated = !this.rotated; draw(); },
		rotated: false,
		selected: false,
		state: function () { return state; },
		turn: function () { return turn; }
	};

};

// Initialize interface
$(document).ready(function () {
	// Initialize game board
	var board = JSChess('black');
	// Click events
	$('div#board').on('click', 'div', function () {
		var e = $(this);
		var i = $('div#board > div').index(e);
		var x = i % 8, y = Math.floor(i / 8);
		if (!!board.selected) {
			board.move(board.selected[0], board.selected[1], x, y);
			board.selected = false;
		} else {
			board.selected = [x, y];
		}
	});
});
