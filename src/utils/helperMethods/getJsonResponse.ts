export function getJsonResponse({
  message,
  data,
  additionalInfo,
  error,
}: {
  message?: string; //// Just in success case
  data?: any;
  additionalInfo?: any;
  error?: string;
}) {
  let finalRespose: any = {};
  if (message) finalRespose.message = message;
  if (data) finalRespose.data = data;
  if (additionalInfo) finalRespose.additionalInfo = additionalInfo;
  if (error) finalRespose.error = error;
  return finalRespose;
}
