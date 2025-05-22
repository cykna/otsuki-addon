export const enum CachingOption {
  None,
  Normal,
  Continuous
}

export interface ClientConfig {
  target?: string;
  uuid: string;
  caching?: CachingOption
}

export interface ResponseData {
  body: string[];
  ok(value: string): any;
}

export interface RequestConfig {
  batch: boolean,
  blocks: boolean,
  cache: number
}

export function default_request_config(): RequestConfig {
  return {
    batch: false,
    blocks: false,
    cache: 0
  }
}
