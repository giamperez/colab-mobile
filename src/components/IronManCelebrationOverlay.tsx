import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  useWindowDimensions,
  Easing,
} from 'react-native';
import Svg, { G, Path, Ellipse, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { onTaskCompleted } from '../utils/taskCompletionEvents';
import { useMascot } from '../context/MascotContext';
import { PixelDog } from './PixelDog';
import { PixelCat } from './PixelCat';

const PET_CELEBRATION_COPY = {
  dog: { badge: 'BUEN CHICO: MISIÓN CUMPLIDA', xp: '¡Guau! Tarea completada con éxito', shadow: '#E29455' },
  cat: { badge: 'MISIÓN FELINA CUMPLIDA', xp: '¡Miau! Tarea completada con éxito', shadow: '#8B93A0' },
};

export const IronManCelebrationOverlay: React.FC = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { mascotType, mascotColorway } = useMascot();
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Animated values (all standard View-compatible with native driver)
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const helmetScale = useRef(new Animated.Value(0.75)).current;
  const helmetOpacity = useRef(new Animated.Value(0)).current;
  const eyeOpacity = useRef(new Animated.Value(0)).current;
  const eyePulse = useRef(new Animated.Value(1)).current;
  const hudRotate = useRef(new Animated.Value(0)).current;
  const hudOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslateY = useRef(new Animated.Value(40)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissCelebration = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(helmetScale, { toValue: 1.12, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setIsVisible(false);
      setTaskTitle(null);
    });
  };

  useEffect(() => {
    const unsubscribe = onTaskCompleted((info) => {
      const title = info?.title || 'Tarea';
      setTaskTitle(title);
      setIsVisible(true);

      // Reset values
      overlayOpacity.setValue(0);
      helmetScale.setValue(0.7);
      helmetOpacity.setValue(0);
      eyeOpacity.setValue(0);
      eyePulse.setValue(1);
      hudRotate.setValue(0);
      hudOpacity.setValue(0);
      bannerTranslateY.setValue(35);
      bannerOpacity.setValue(0);

      // 1. Enter Overlay & Helmet
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(helmetScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(helmetOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(hudOpacity, { toValue: 0.85, duration: 400, useNativeDriver: true }),
        Animated.timing(hudRotate, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }),
      ]).start();

      // 2. Eyes power-up flicker & arc reactor blast
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(eyeOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(eyeOpacity, { toValue: 0.15, duration: 60, useNativeDriver: true }),
          Animated.timing(eyeOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(eyeOpacity, { toValue: 0.4, duration: 60, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(eyeOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.spring(eyePulse, { toValue: 1.15, friction: 3, useNativeDriver: true }),
          ]),
          Animated.spring(eyePulse, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]).start();
      }, 350);

      // 3. Banner appearance
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(bannerTranslateY, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
          Animated.timing(bannerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      }, 400);

      // 4. Auto dismiss after 2.6 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dismissCelebration();
      }, 2600);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isVisible) return null;

  const hudRotation = hudRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={dismissCelebration}
      style={[styles.fullOverlay, { width: screenWidth, height: screenHeight }]}
    >
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />

      <Animated.View
        style={[
          styles.container,
          {
            opacity: overlayOpacity,
            transform: [{ scale: helmetScale }],
          },
        ]}
      >
        {/* Futuristic Stark Tech Cyber HUD Ring */}
        <Animated.View
          style={[
            styles.hudCircleWrapper,
            {
              opacity: hudOpacity,
              transform: [{ rotate: hudRotation }],
            },
          ]}
        >
          <Svg width={320} height={320} viewBox="0 0 320 320">
            <Circle
              cx={160}
              cy={160}
              r={150}
              stroke="#00F0FF"
              strokeWidth={1.5}
              strokeDasharray="16, 8, 4, 8"
              fill="none"
              opacity={0.5}
            />
            <Circle
              cx={160}
              cy={160}
              r={136}
              stroke="#F59E0B"
              strokeWidth={1}
              strokeDasharray="30, 20"
              fill="none"
              opacity={0.4}
            />
          </Svg>
        </Animated.View>

        {/* Pixel-art pet celebration (shown when a pet mascot is selected) */}
        {mascotType !== 'ironman' && (
          <Animated.View
            style={[
              styles.svgContainer,
              { opacity: helmetOpacity, shadowColor: PET_CELEBRATION_COPY[mascotType].shadow },
            ]}
          >
            {mascotType === 'dog' ? (
              <PixelDog pose="celebrating" pixelSize={9} colorway={mascotColorway} />
            ) : (
              <PixelCat pose="celebrating" pixelSize={9} colorway={mascotColorway} />
            )}
          </Animated.View>
        )}

        {/* Vector Iron Man Mask SVG */}
        {mascotType === 'ironman' && (
        <Animated.View style={[styles.svgContainer, { opacity: helmetOpacity }]}>
          <Svg width={234} height={340} viewBox="-2 -2 236 342">
            {/* Outline Helmet Armor Paths */}
            <G id="Group" stroke="#E62429" strokeWidth={2.4} fill="none">
              <Path
                d="M5.63276137,182.54231 C6.80194953,193.172437 6.3213287,203.463688 8.78389181,213.305988 C10.8893725,221.721111 17.2164459,227.370951 20.3046414,235.047931 C22.6954227,240.991202 26.777593,245.814282 29.6168696,251.304822 C35.2175982,262.135407 56.0371828,337.714307 56.0371828,337.714307 L132.704815,337.714307 C132.704815,337.714307 160.705733,315.283257 173.036553,307.661609 C182.772217,301.64402 198.272915,283.720624 198.272915,283.720624 C198.272915,283.720624 206.932701,245.86977 214.495314,229.699603 C217.836426,222.555731 220.443269,212.466228 222.464701,200.907166 C222.48683,200.780625 223.103167,200.325007 223.266634,200.163245 C223.681908,199.7523 223.934824,199.476798 224.4066,198.785907 C225.002278,197.913567 225.542985,196.991182 225.943324,196.093396 C226.210144,195.495036 226.511624,194.766691 226.738562,194.309912 C227.147039,193.487729 227.618919,191.858807 227.823369,191.187781 C228.253181,189.777088 228.495384,189.025237 228.650347,188.166614 C228.683934,187.980515 230.030425,182.597722 230.883627,176.052008 C231.263252,173.139547 231.535873,170.000075 231.687372,166.980798 C231.753545,165.661991 231.803387,164.400955 231.888486,163.157758 C232.04826,160.823641 231.98299,158.213817 231.974911,155.880066 C231.957094,150.733641 231.600491,145.751759 231.121789,141.324454 C230.120098,132.060257 228.59446,125.32839 228.59446,125.32839 C228.59446,125.32839 228.650347,120.08005 228.650347,117.658292 C228.650347,108.520701 224.714553,97.0342203 223.830314,89.1118744 C218.874905,44.7138416 207.944892,26.1540212 179.03144,14.5543922 C163.897012,8.4826969 139.335592,0 117.79845,0 C79.2072247,0 35.7979014,21.0164772 12.5429347,54.868483 C3.90403848,67.4440326 4.65665878,81.6018722 1.51397958,97.2334808 C-2.23398125,115.875745 1.51397953,136.521269 1.51397953,157.8 C1.51397953,166.642709 4.70375912,174.095923 5.63276137,182.54231 Z"
              />
              <Ellipse cx={220.310078} cy={157.2} rx={11.6899225} ry={44.4} stroke="#F59E0B" />
              <Ellipse cx={223.607235} cy={158.1} rx={8.39276486} ry={35.7} stroke="#F59E0B" />
              <Path d="M205.16142,257.069968 L204.02662,251.721838 C203.200382,247.827911 201.39308,241.665666 199.983114,237.940156 L186.169296,201.440316 L167.312606,243.098893 L151.529633,274.897142 L149.316556,280.136082 L132.515841,296.568444 L115.514765,285.903702 L55.6979359,286.309327 L51.840989,287.936383 L49.891546,293.800765 L39.4806764,280.264684" stroke="#F59E0B" />
              <Path d="M194.337627,181.231481 L186.176483,201.202524 L177.196317,213.410805 L163.81206,230.377018 C161.351205,233.496459 157.905145,238.90214 156.109916,242.461162 L153.013738,248.599303 C151.220818,252.153751 149.533749,258.250134 149.245749,262.213442 L148.266938,275.683325 L132.12878,290.819054 L120.219641,280.287181 L49.4682501,281.898244 L46.8615659,290.032871" stroke="#F59E0B" />
              <Path d="M50.6622452,318.41541 L57.7265898,310.781263 L72.2413693,310.197892 L74.0673855,305.346346 L92.8443872,304.762976 L94.0624903,310.047492 L111.268481,310.047492 L141.060777,319.315335 L178.093387,284.13536 L162.838638,294.929993 L149.217245,280.096174" stroke="#F59E0B" />
              <Ellipse cx={192.73385} cy={263.1} rx={2.69767442} ry={5.1} stroke="#F59E0B" />
              <Path d="M174.026355,12.6174134 L169.487865,17.2932552 C166.718666,20.1462603 162.779378,25.2030573 160.689513,28.5874508 L157.323962,34.037732 L165.99062,38.6966084 C169.494422,40.5801238 174.835467,44.1301036 177.932696,46.6358384 L183.991501,51.5375611 L183.847056,57.9405908 C183.757357,61.9168514 183.206733,68.3328583 182.619024,72.2589855 L179.849992,90.7572128 L177.544308,106.765455 C176.977025,110.704073 175.900421,117.053408 175.135484,120.96839 L171.762371,138.232152 L180.930381,153.944907 L188.527514,111.891792 C189.235297,107.973933 190.773363,101.716226 191.956657,97.9347013 L193.54097,92.8716128 C194.72705,89.0811835 196.930253,83.0317212 198.458885,79.3671372 L213.050991,44.385537" stroke="#E62429" />
              <Path d="M141.282422,2.63668846 L134.791041,9.77822094 L127.684098,18.1905018 L124.820956,23.1431151 L145.475765,29.5078751 L157.509038,34.082202" stroke="#E62429" />
              <Path d="M10.5768439,58.0315472 L29.4327053,42.7882975 L36.781002,29.1745233" stroke="#E62429" />
              <Path d="M29.56377,42.6492435 L37.8613285,37.8727934 C41.306665,35.8895019 47.156121,33.2736542 50.9447853,32.0240882 L56.9968728,30.0280067 L57.8640635,27.4624913 C59.137839,23.6941265 61.8466982,17.8819889 63.9130079,14.4831233 L65.5380282,11.8101329" stroke="#E62429" />
              <Path d="M57.0513462,29.8705525 L54.0239924,38.7547732 L52.6332444,46.5628977 C52.6332444,46.5628977 69.9714804,40.2595769 80.2869593,39.6062984 C90.6024382,38.9530199 114.526118,42.6432265 114.526118,42.6432265 L124.725047,23.3094344" stroke="#F59E0B" />
              <Path d="M52.7116579,46.2577505 L49.3293853,63.3187359 C48.5567286,67.2161995 47.6756075,73.5895679 47.3607301,77.561825 L45.4061251,102.219657 C45.4061251,102.219657 61.1449509,104.931583 69.319265,104.496676 C77.4935791,104.061769 94.4520096,99.6102157 94.4520096,99.6102157 L102.202953,74.4 L107.524761,59.2531816 C108.842522,55.5025957 111.275031,49.5371778 112.953978,45.9375024 L114.417028,42.8007119" stroke="#F59E0B" />
              <Path d="M60.9313742,43.6619838 L53.9634453,67.9691317 L48.7626755,89.2363215 L45.5140222,102.108393" stroke="#F59E0B" />
              <Path d="M194.33998,181.375592 L193.480419,177.510239 L180.939272,153.902647 L169.1131,167.786098 L143.405581,182.693266 C139.962313,184.689934 133.943345,186.36864 129.963469,186.44273 L105.939512,186.889966 C101.958906,186.964071 96.1166601,185.61665 96.1166601,185.61665 L96.1166601,185.61665 L94.7940983,177.246507 L50.3680122,179.617432 L47.7784613,188.841251 L42.0031511,189.604686 C38.0627842,190.12556 31.6558219,190.403409 27.6729275,190.224385 L22.7400068,190.00266 C18.7660097,189.824036 13.1719692,187.489732 10.2513565,184.794373 L5.25954168,180.187554" stroke="#E62429" />
              <Path d="M2.09570264,164.827353 L10.5682255,169.574582 L26.6388817,172.732065 L45.412635,175.724716 L50.2845093,179.595116 L94.9253624,177.240092 L102.085958,172.184268 L124.740298,165.946289 L145.350303,159.092409 L153.539474,156.332695 L161.876527,167.044376 L169.458159,167.336156" stroke="#F59E0B" />
              <Path d="M194.385725,181.150376 L191.447818,185.416533 C189.191398,188.693095 185.005161,193.561922 182.113478,196.276452 L174.985753,202.96751 L162.948539,214.650889 L154.50711,223.72649 C151.799555,226.637452 147.732625,231.626007 145.423648,234.868344 L130.549467,255.755136 C128.240365,258.99765 125.362594,264.684165 124.119589,268.463008 L120.235465,280.271072" stroke="#F59E0B" />
              <Path d="M18.5087527,231.394093 L29.6506505,248.67255 L39.6642394,263.888481 L46.084218,276.550986 L49.5900589,282.203661" stroke="#E62429" />
              <Path d="M183.95317,51.47048 C183.95317,51.47048 187.731927,43.9277824 190.453645,40.9662534 C193.233164,37.9418299 194.486825,37.5379936 194.486825,37.5379936 C197.783995,35.3148427 203.260042,35.107404 206.716031,37.0735931 L210.103507,39.000803" stroke="#E62429" />
              <Path d="M97.5555478,175.606778 L98.0699842,176.910075 C99.5300542,180.609083 103.912979,183.243725 107.866873,182.793875 L130.153205,180.258275 C134.103808,179.8088 140.186208,177.990916 143.737456,176.198508 L161.783437,167.090228" stroke="#F59E0B" />
              <Path d="M10.6238966,169.76763 L12.2334207,176.49703 C13.1595567,180.369193 17.1300117,183.615853 21.1105843,183.748946 L48.968031,184.680377" stroke="#F59E0B" />
            </G>

            {/* Cyan Eyes */}
            <Path
              d="M98.6581966,176.290866 C98.6581966,176.290866 99.1212927,178.386675 100.432982,180.066144 C101.725568,181.721155 103.858062,182.956532 105.053563,183.443653 C106.818571,184.162826 110.311163,183.876835 113.999312,183.443653 C118.949437,182.862249 124.226711,181.920462 125.912624,181.88046 C133.685006,181.696046 143.614627,177.756277 143.614627,177.756277 L162.621944,167.942929 L154.49673,157.417364 C154.49673,157.417364 135.505697,163.857703 125.912623,166.790818 C118.42587,169.079918 103.257249,173.084007 103.257249,173.084007 L98.6581966,176.290866 Z"
              id="right-eye"
              fill="#00F0FF"
              stroke="#FFFFFF"
              strokeWidth={1}
            />
            <Path
              d="M11.7128323,170.694824 C11.7128323,170.694824 12.9740116,181.439742 17.4408649,183.185084 C25.715583,186.418281 49.9375458,185.630441 49.9375458,185.630441 L51.3263283,180.653678 L46.3375778,176.781708 L11.7128323,170.694824 Z"
              id="left-eye"
              fill="#00F0FF"
              stroke="#FFFFFF"
              strokeWidth={1}
            />
          </Svg>
        </Animated.View>
        )}

        {/* Celebratory Banner & Mission Accomplished Notice */}
        <Animated.View
          style={[
            styles.bannerContainer,
            {
              opacity: bannerOpacity,
              transform: [{ translateY: bannerTranslateY }],
            },
          ]}
        >
          <View style={styles.badgeRow}>
            <Ionicons name="sparkles" size={13} color="#00F0FF" />
            <Text style={styles.badgeText}>
              {mascotType === 'ironman' ? 'PROTOCOLO STARK: MISIÓN CUMPLIDA' : PET_CELEBRATION_COPY[mascotType].badge}
            </Text>
            <Ionicons name="sparkles" size={13} color="#00F0FF" />
          </View>

          <Text style={styles.titleText} numberOfLines={2}>
            {taskTitle}
          </Text>

          <View style={styles.rewardRow}>
            <View style={styles.xpPill}>
              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
              <Text style={styles.xpText}>
                {mascotType === 'ironman' ? '¡Tarea Completada con éxito!' : PET_CELEBRATION_COPY[mascotType].xp}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 14, 0.88)',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  hudCircleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#E62429',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 28,
    shadowOpacity: 0.85,
    elevation: 20,
  },
  bannerContainer: {
    marginTop: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(20, 24, 38, 0.95)',
    borderWidth: 1.5,
    borderColor: '#00F0FF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 14,
    maxWidth: 340,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    shadowOpacity: 0.5,
    elevation: 12,
    zIndex: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#00F0FF',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 2,
  },
  rewardRow: {
    marginTop: 8,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: '700',
  },
});

export default IronManCelebrationOverlay;
