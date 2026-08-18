import buffer from "node:buffer";

/** Node 24+ removed SlowBuffer; old jsonwebtoken / jwa still read it at load time. */
if (typeof buffer.SlowBuffer !== "function") {
	buffer.SlowBuffer = buffer.Buffer;
}
