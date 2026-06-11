declare module 'react-native-razorpay' {
  export type RazorpayPrefill = {
    name?: string;
    email?: string;
    contact?: string;
  };

  export type RazorpayCheckoutOptions = {
    key: string;
    subscription_id?: string;
    order_id?: string;
    amount?: string | number;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    prefill?: RazorpayPrefill;
    theme?: {color?: string};
    notes?: Record<string, string>;
  };

  export type RazorpaySuccessResponse = {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
  };

  export type RazorpayErrorResponse = {
    code?: number;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };

  const RazorpayCheckout: {
    open(
      options: RazorpayCheckoutOptions,
    ): Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}
