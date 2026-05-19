export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  ResetPassword: { token?: string }
}

export type RootStackParamList = AuthStackParamList & {
  Home: undefined
}
