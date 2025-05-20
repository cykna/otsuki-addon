export interface ClientConfig {
  target?: string;
  uuid: string;
}

export interface ResponseData {
  body: string[];
  ok(value: string): any;
}

export interface RequestConfig {
  batch: boolean,
  blocks: boolean
}

export function default_request_config(): RequestConfig {
  return {
    batch: false,
    blocks: false
  }
}
