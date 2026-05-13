<script lang="ts">
  import { Header, Controls, PipelineCard, ActivityFeed, Console, Order } from './lib/components';
  import { createVoiceSession } from './lib/websocket';

  const voiceSession = createVoiceSession();
</script>

<div class="max-w-3xl mx-auto">
  <Header />
  <Controls onStart={() => voiceSession.start()} onStop={() => voiceSession.stop()} />
  <PipelineCard />
  <Order />
  <ActivityFeed />
  <Console />
</div>

