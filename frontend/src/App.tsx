import { AppWrapper } from "./component/AppWrapper";
import { TabViewer } from "./component/TabViewer";
import { MqttConnectionController } from "./component/MqttConnectionController";
import { useDisconnectMqttOnUnmount } from "./hooks";
import { Ex05EnvDashboard } from "./examples/ex05-env-dashboard";
import { Ex01JsonViewer } from "./examples/ex01-json-viewer";
import { Ex02GetMqttData } from "./examples/ex02-get-mqtt-data";
import { Ex03SingleTopicJson } from "./examples/ex03-single-topic-json";
import { Ex04ImuPlot } from "./examples/ex04-imu-plot";

export default function App() {
  useDisconnectMqttOnUnmount();

  return (
    <AppWrapper>
      <MqttConnectionController />
      <TabViewer
        tabs={[
          { title: "Ex01", app: Ex01JsonViewer },
          { title: "Ex02", app: Ex02GetMqttData },
          { title: "Ex03", app: Ex03SingleTopicJson },
          { title: "Ex04", app: Ex04ImuPlot },
          { title: "Ex05", app: Ex05EnvDashboard },
        ]}
      />
    </AppWrapper>
  );
}
