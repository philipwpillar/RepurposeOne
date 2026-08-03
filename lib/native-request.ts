import { headers } from "next/headers";
import { NATIVE_HEADER } from "@/lib/native-ua";

export {
  NATIVE_HEADER,
  NATIVE_UA_TOKEN,
  isNativeUserAgent,
} from "@/lib/native-ua";

export async function isNativeRequest(): Promise<boolean> {
  return (await headers()).get(NATIVE_HEADER) === "1";
}
