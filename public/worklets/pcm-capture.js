// Decaya raw PCM capture. Runs on the audio thread: copies input channel 0 into a
// buffer and posts it to the main thread in fixed-size chunks, so the clap tail is
// analyzed without any codec in between. Loaded by recordClaps in lib/acoustics.ts.
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const size = (options && options.processorOptions && options.processorOptions.chunk) || 4096;
    this.buffer = new Float32Array(size);
    this.filled = 0;
    this.port.onmessage = (event) => {
      if (event.data === "flush") {
        const rest = this.buffer.slice(0, this.filled);
        this.filled = 0;
        this.port.postMessage({ samples: rest, final: true }, [rest.buffer]);
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (channel) {
      let read = 0;
      while (read < channel.length) {
        const take = Math.min(channel.length - read, this.buffer.length - this.filled);
        this.buffer.set(channel.subarray(read, read + take), this.filled);
        this.filled += take;
        read += take;
        if (this.filled === this.buffer.length) {
          const full = this.buffer;
          this.buffer = new Float32Array(full.length);
          this.filled = 0;
          this.port.postMessage({ samples: full }, [full.buffer]);
        }
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor);
