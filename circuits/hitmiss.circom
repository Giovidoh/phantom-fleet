// Phantom Fleet — hit/miss proof circuit
//
// Proves: "given a hidden 10x10 board (private) and salt, the cell (x, y) of the
// fleet committed in `commitment` contains ship/water == result" — without
// revealing anything else about the board.
//
//   private inputs: board[100] (0/1), salt
//   public  inputs: commitment, x, y, result
//
//   commitment === Poseidon(packed, salt)   where packed = Σ board[i]·2^i
//   result     === board[x*10 + y]
//
pragma circom 2.1.0;

include "comparators.circom";   // IsEqual, LessThan, Num2Bits (via bitify)
include "poseidon.circom";      // Poseidon(nInputs)

template HitMiss() {
    // private
    signal input board[100];
    signal input salt;
    // public
    signal input commitment;
    signal input x;
    signal input y;
    signal input result;

    // 1. every board cell is a bit
    for (var i = 0; i < 100; i++) {
        board[i] * (board[i] - 1) === 0;
    }

    // 2. packed = Σ board[i]·2^i  (100 bits fit easily in the bn128 field)
    var lc = 0;
    for (var i = 0; i < 100; i++) {
        lc += board[i] * (1 << i);
    }
    signal packed <== lc;

    // 3. commitment === Poseidon(packed, salt)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== packed;
    hasher.inputs[1] <== salt;
    commitment === hasher.out;

    // 4. x, y ∈ [0, 9]  (first force into 4 bits = [0,15], then < 10)
    component xBits = Num2Bits(4);
    xBits.in <== x;
    component yBits = Num2Bits(4);
    yBits.in <== y;
    component xLt = LessThan(4);
    xLt.in[0] <== x;
    xLt.in[1] <== 10;
    xLt.out === 1;
    component yLt = LessThan(4);
    yLt.in[0] <== y;
    yLt.in[1] <== 10;
    yLt.out === 1;

    // 5. result === board[x*10 + y]  (100-way select via IsEqual one-hot)
    signal idx <== x * 10 + y;
    component eq[100];
    signal term[100];
    var resLc = 0;
    for (var i = 0; i < 100; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== idx;
        eq[i].in[1] <== i;
        term[i] <== eq[i].out * board[i];   // one quadratic constraint per cell
        resLc += term[i];                   // linear combination
    }
    result === resLc;

    // 6. result is a bit
    result * (result - 1) === 0;
}

component main {public [commitment, x, y, result]} = HitMiss();
