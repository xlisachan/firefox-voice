/* globals intentParser, intentRunner, intentExamples, log */

this.main = (function() {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === "runIntent") {
      const desc = intentParser.parse(message.text);
      return intentRunner.runIntent(desc);
    } else if (message.type === "getExamples") {
      return intentExamples.getExamples(message.number || 2);
    } else if (message.type === "bouncePopup") {
      browser.experiments.voice.bouncePopup();
      setTimeout(() => {
        browser.experiments.voice.bouncePopup();
      }, 100);
      return null;
    }
    log.error(
      `Received message with unexpected type (${message.type}): ${message}`
    );
    return null;
  });
})();
