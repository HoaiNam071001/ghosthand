import {ComponentType, useEffect, useState} from 'react';
import MainScreen from './screens/MainScreen';
import PreviewScreen from './screens/PreviewScreen';
import OverlayScreen from './screens/OverlayScreen';
import MiniBar from './screens/MiniBar';
import DemoScreen from './screens/DemoScreen';
import DemoOverlay from './screens/DemoOverlay';
import DemoMiniBar from './screens/DemoMiniBar';
import DemoFlow from './screens/DemoFlow';
import DemoIllus from './screens/DemoIllus';
import DemoGuide from './screens/DemoGuide';
import DemoMcp from './screens/DemoMcp';

// Chọn màn theo hash URL (#preview, #overlay, #minibar, #demo, #demo-overlay, #demo-minibar, #demo-flow, #demo-illus, #demo-guide, #demo-mcp). setWindowMode() (windowMode.ts) đổi
// kích thước cửa sổ bên Go rồi đổi hash; trên trình duyệt đổi hash tay để xem từng màn.
const screens: Record<string, ComponentType> = {
    main: MainScreen,
    preview: PreviewScreen,
    overlay: OverlayScreen,
    minibar: MiniBar,
    // giao diện đầy đủ với dữ liệu mẫu, kể cả tính năng chưa có logic (bước 27b)
    demo: DemoScreen,
    'demo-overlay': DemoOverlay,
    'demo-minibar': DemoMiniBar,
    'demo-flow': DemoFlow, // canvas flow kiểu n8n (bước 20 F4a)
    'demo-illus': DemoIllus, // lưới hoạt hoạ minh hoạ node (bước 47)
    'demo-guide': DemoGuide, // modal Hướng dẫn, nội dung thật (bước 51)
    'demo-mcp': DemoMcp, // tab MCP server + form đối số tool (bước 55)
};

function App() {
    const [hash, setHash] = useState(location.hash.slice(1));

    useEffect(() => {
        const onHash = () => setHash(location.hash.slice(1));
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const Screen = screens[hash] ?? MainScreen;
    return <Screen/>;
}

export default App
