export const messageBuilder = {
  request: params => ({
    type: "request",
    ...params
  }),
  response: data => ({
    type: "response",
    data: data
  })
};

export const MESSAGE_TYPES = {
  FETCH_DATA: "FETCH_DATA",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  VERIFY_URL: "VERIFY_URL",
  VALIDATE_TOKEN: "VALIDATE_TOKEN"
};

export const APP_ID = 1127420;
