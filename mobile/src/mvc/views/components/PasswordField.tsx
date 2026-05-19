import { forwardRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../../theme/colors'

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  inputStyle?: StyleProp<TextStyle>
  wrapStyle?: StyleProp<ViewStyle>
  rtl?: boolean
}

export const PasswordField = forwardRef<TextInput, Props>(function PasswordField(
  { inputStyle, wrapStyle, rtl, editable = true, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const canToggle = editable !== false

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <TextInput
        ref={ref}
        {...rest}
        editable={editable}
        secureTextEntry={!visible}
        style={[styles.input, rtl && styles.inputRtl, inputStyle, canToggle && (rtl ? styles.inputPadStart : styles.inputPadEnd)]}
      />
      {canToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          style={[styles.toggle, rtl ? styles.toggleStart : styles.toggleEnd]}
          onPress={() => setVisible((v) => !v)}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
  },
  inputRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputPadEnd: {
    paddingRight: 44,
  },
  inputPadStart: {
    paddingLeft: 44,
  },
  toggle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 44,
    alignItems: 'center',
  },
  toggleEnd: {
    right: 0,
  },
  toggleStart: {
    left: 0,
  },
})
