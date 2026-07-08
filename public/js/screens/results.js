/* ============================================================
   Results Screen — Final Leaderboard & Winner Celebration
   ============================================================ */

Screens.results = {
  onMatchEnd(data) {
    App.showScreen('results');

    const leaderboard = document.getElementById('final-leaderboard');
    let html = '';

    data.finalScores.forEach((player, index) => {
      const isWinner = index === 0;
      const isSelf = player.id === Network.getPlayerId();
      const rankClass = `rank-${player.rank}`;

      html += `
        <div class="leaderboard-entry ${isWinner ? 'winner winner-glow' : ''}">
          <div class="lb-rank ${rankClass}">
            ${isWinner ? '👑' : player.rank}
          </div>
          <div class="lb-info">
            <div class="lb-name ${isWinner ? 'winner-name' : ''}">
              ${player.name}${isSelf ? ' (You)' : ''}
            </div>
          </div>
          <div class="lb-score">${player.score}</div>
        </div>
      `;
    });

    leaderboard.innerHTML = html;

    // Confetti!
    setTimeout(() => Animations.confetti.start(), 500);
    Audio.play('winner');

    // Check if I won — add coins
    if (data.winner && data.winner.id === Network.getPlayerId()) {
      const coins = parseInt(localStorage.getItem('cp_coins') || '0') + 50;
      localStorage.setItem('cp_coins', String(coins));
      UI.toast('🏆 You Won! +50 Coins', 'success', 5000);
    }
  },

  playAgain() {
    Audio.play('click');
    Animations.confetti.stop();
    Network.emit('play-again');
    Screens.lobby.isReady = false;
    App.showScreen('lobby');
  },

  backToMenu() {
    Audio.play('click');
    Animations.confetti.stop();
    Network.emit('leave-room');
    Network.reset();
    App.showScreen('menu');
    Screens.menu.updateDisplay(Screens.menu.getPlayerName());
  }
};
