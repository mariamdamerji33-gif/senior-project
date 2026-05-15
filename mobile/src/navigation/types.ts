export type AuthStackParamList = {
  Login: undefined
  ForgotPassword: undefined
  ResetPassword: { token?: string }
}

export type RootStackParamList = AuthStackParamList & {
  Home: undefined
}
