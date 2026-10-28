import 'server-only';
import { proxyConfig } from "@/config/proxy";
import { getIpFromHeaders } from "@/core/ip";
import { headers } from "next/headers";
import { cache } from "react";

export const getUserIp = cache(async () => {
  return getIpFromHeaders(await headers(), proxyConfig.trustedHops);
})
