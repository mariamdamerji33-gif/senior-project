import { createDrawerNavigator, type DrawerContentComponentProps } from '@react-navigation/drawer'
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { colors } from '../theme/colors'
import { useAuth } from '../mvc/controllers/AuthController'
import { DisplayComfortToolbar } from '../mvc/views/components/DisplayComfortToolbar'
import { AdminAccountProfileScreen, AdminManagerHomeScreen } from '../mvc/views/screens'
import { useConfirmDialog } from '../mvc/views/components/useConfirmDialog'
import type { AdminDrawerParamList } from './parentDrawerTypes'

const Drawer = createDrawerNavigator<AdminDrawerParamList>()

export function AdminDrawerSidebar(props: DrawerContentComponentProps) {
  const { navigation } = props
  const { logout } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const routes = props.state.routes
  const index = props.state.index
  const active = routes[index]?.name

  return (
    <View style={styles.wrap}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          accessibilityState={{ selected: active === 'AccountProfile' }}
          onPress={() => navigation.navigate('AccountProfile')}
          style={[styles.logoWrap, active === 'AccountProfile' && styles.logoWrapActive]}
        >
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </Pressable>
        <Text style={styles.menu}>Menu</Text>
        <Pressable style={active === 'AccountProfile' ? styles.btnOn : styles.btn} onPress={() => navigation.navigate('AccountProfile')}>
          <Text style={active === 'AccountProfile' ? styles.iconOn : styles.icon}>◎</Text>
          <Text style={active === 'AccountProfile' ? styles.labOn : styles.lab}>Profile</Text>
        </Pressable>
        <Pressable style={active === 'Summary' ? styles.btnOn : styles.btn} onPress={() => navigation.navigate('Summary')}>
          <Text style={active === 'Summary' ? styles.iconOn : styles.icon}>▦</Text>
          <Text style={active === 'Summary' ? styles.labOn : styles.lab}>Summary</Text>
        </Pressable>
        <DisplayComfortToolbar variant="drawer" />
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={styles.outBtn}
          onPress={() => {
            void (async () => {
              const ok = await confirm({
                title: 'Log out?',
                description: 'You will need to sign in again to use the admin tools.',
                confirmLabel: 'Log out',
                cancelLabel: 'Stay signed in',
                tone: 'primary',
              })
              if (!ok) return
              logout()
            })()
          }}
        >
          <Text style={styles.outText}>Out</Text>
        </Pressable>
      </View>
      {confirmDialog}
    </View>
  )
}

export function AdminDrawerNavigator() {
  const { width } = useWindowDimensions()
  const drawerWidth = width < 390 ? 80 : width >= 768 ? 112 : 92

  return (
    <Drawer.Navigator
      initialRouteName="Summary"
      drawerContent={(props) => <AdminDrawerSidebar {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        drawerType: 'permanent',
        sceneContainerStyle: { flex: 1, backgroundColor: colors.pageBg },
        drawerStyle: { width: drawerWidth, backgroundColor: 'transparent', borderRightWidth: 0 },
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen name="AccountProfile" component={AdminAccountProfileScreen} options={{ title: 'Profile' }} />
      <Drawer.Screen name="Summary" component={AdminManagerHomeScreen} />
    </Drawer.Navigator>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#211a2e', borderTopRightRadius: 22, borderBottomRightRadius: 22 },
  scroll: { paddingTop: 14, paddingHorizontal: 8, gap: 10, paddingBottom: 12 },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  logoWrapActive: {
    borderColor: '#6d46d4',
  },
  logo: { width: 36, height: 36, borderRadius: 10 },
  menu: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  btn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnOn: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  icon: { color: '#ddd6fe', fontSize: 16, fontWeight: '900' },
  lab: { color: '#ddd6fe', fontSize: 9, fontWeight: '900' },
  iconOn: { color: '#6d46d4', fontSize: 16, fontWeight: '900' },
  labOn: { color: '#6d46d4', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  footer: { paddingHorizontal: 6, paddingBottom: 10 },
  outBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  outText: { color: '#fca5a5', fontSize: 11, fontWeight: '900' },
})
