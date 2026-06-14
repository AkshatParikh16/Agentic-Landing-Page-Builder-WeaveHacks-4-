(function () {
  const statusEl = document.getElementById('build-status');
  const errorEl = document.getElementById('build-error');

  function showError(msg) {
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = msg;
    }
    if (statusEl) statusEl.textContent = 'Build failed';
  }

  function setLane(agent, status, message) {
    const lane = document.querySelector('[data-agent="' + agent + '"]');
    if (!lane) return;
    const msgEl = lane.querySelector('[data-lane-message]');
    const badgeEl = lane.querySelector('[data-lane-badge]');
    if (msgEl) {
      msgEl.textContent = message || (status === 'done' ? 'Complete' : status === 'running' ? 'Working…' : 'Waiting…');
      msgEl.style.fontStyle = status === 'done' ? 'normal' : 'italic';
      msgEl.style.color = status === 'done' ? '#34d399' : '';
    }
    if (badgeEl) {
      badgeEl.textContent = status === 'running' ? '…' : status === 'done' ? '✓' : '·';
      badgeEl.setAttribute('data-status', status);
    }
    lane.setAttribute('data-status', status);
  }

  function runPipeline(payload) {
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: payload.prompt, answers: payload.answers || {} }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Server error ' + res.status);
        if (!res.body) throw new Error('No stream body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventCount = 0;
        let finished = false;

        function pump() {
          if (finished) return Promise.resolve();
          return reader.read().then(function (chunk) {
            if (chunk.done) {
              if (!finished && eventCount === 0) {
                showError('Stream ended with no agent events. Restart dev server: cd web && npm run dev');
              } else if (!finished) {
                showError('Build finished but no result page was returned. Please try again.');
              }
              return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (let i = 0; i < parts.length; i++) {
              const line = parts[i].split('\n').find(function (l) { return l.startsWith('data: '); });
              if (!line) continue;
              let event;
              try {
                event = JSON.parse(line.slice(6));
              } catch (e) {
                continue;
              }
              eventCount++;
              if (event.agent === 'DONE') {
                finished = true;
                if (statusEl) statusEl.textContent = 'Done! Opening your landing page…';
                if (event.resultId) {
                  window.location.href = '/result?id=' + encodeURIComponent(event.resultId);
                  return;
                }
                showError('Build completed but HTML was not saved. Please try again.');
                return;
              }
              if (event.agent === 'ERROR') throw new Error(event.message || 'Unknown error');
              setLane(event.agent, event.status, event.message);
            }
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        showError(err.message || String(err));
      });
  }

  fetch('/api/build-session')
    .then(function (res) {
      if (!res.ok) throw new Error('Session expired. Go back and start again.');
      return res.json();
    })
    .then(function (payload) {
      if (!payload.prompt) throw new Error('Session missing prompt. Start again from home.');
      runPipeline(payload);
    })
    .catch(function (err) {
      showError(err.message || 'Could not load build session.');
    });
})();
