import Svg, { Circle, Path } from 'react-native-svg';
import { Text, View } from 'react-native';

/**
 * El símbolo de Nexvio (la N como red de nodos) dibujado con react-native-svg.
 * Colores fijos de marca: violeta #5A46F0 + nodo coral #FF7A59. El violeta se
 * ve bien tanto en claro como en oscuro.
 */
export function NexvioMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M16 48 L16 16 L48 48 L48 16"
        stroke="#5A46F0"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <Circle cx={16} cy={48} r={5.4} fill="#5A46F0" />
      <Circle cx={16} cy={16} r={5.4} fill="#5A46F0" />
      <Circle cx={32} cy={32} r={4.4} fill="#5A46F0" />
      <Circle cx={48} cy={48} r={5.4} fill="#5A46F0" />
      <Circle cx={48} cy={16} r={5.6} fill="#FF7A59" />
    </Svg>
  );
}

/** Logo completo = símbolo + wordmark "Nexvio". */
export function Logo() {
  return (
    <View className="flex-row items-center gap-2">
      <NexvioMark size={40} />
      <Text className="text-3xl font-extrabold text-primary">Nexvio</Text>
    </View>
  );
}
