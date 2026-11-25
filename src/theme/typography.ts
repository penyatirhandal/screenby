/**
 * Font families are bundled as Android assets:
 * android/app/src/main/assets/fonts/<name>.ttf
 *
 * On Android React Native resolves a custom family by its asset file name.
 */
export const fonts = {
  display: 'PlusJakartaSans-ExtraBold',
  displayBold: 'PlusJakartaSans-Bold',
  displaySemiBold: 'PlusJakartaSans-SemiBold',
  displayMedium: 'PlusJakartaSans-Medium',

  body: 'Rubik-Regular',
  bodyMedium: 'Rubik-Medium',
  bodySemiBold: 'Rubik-SemiBold',
  bodyBold: 'Rubik-Bold',

  icon: 'MaterialSymbolsOutlined',
  iconFilled: 'MaterialSymbolsFilled',
} as const;

export const letterSpacing = {
  tight: -1,
  wide: 1.6,
} as const;
