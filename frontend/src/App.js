import React, { useRef, useState, useEffect } from "react";
import {
  Button, Select, MenuItem, Box, Typography, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
  TextField, FormControl, InputLabel, Slider, IconButton
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const behaviors = ["jumping", "unsupported rearing", "supported rearing", "grooming", "freezing", "etc"];
const rowsPerPage = 15;

function App() {
  const [intervals, setIntervals] = useState([]);
  const [intervalStart, setIntervalStart] = useState("");
  const [intervalEnd, setIntervalEnd] = useState("");
  const [intervalBehavior, setIntervalBehavior] = useState(behaviors[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [page, setPage] = useState(0);
  const [frameRate, setFrameRate] = useState(1);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [markStart, setMarkStart] = useState(null);
  const [isAddingInterval, setIsAddingInterval] = useState(false);
  const [themeMode, setThemeMode] = useState("light");

  const videoRef = useRef(null);

  const theme = createTheme({
    palette: {
      mode: themeMode,
      ...(themeMode === "dark" ? {
        background: { default: "#121212", paper: "#1e1e1e" },
        text: { primary: "#e0e0e0" },
        primary: { main: "#90caf9" },
      } : {
        background: { default: "#ffffff", paper: "#ffffff" },
        text: { primary: "#000000" },
        primary: { main: "#1976d2" },
      }),
    },
  });

  const toggleTheme = () => {
    setThemeMode(prev => (prev === "light" ? "dark" : "light"));
  };

  async function onFileChange(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      alert("비디오를 선택해주세요.");
      return;
    }
    setIsUploading(true);
    setIsConverting(true);

    const file = files[0];
    if (!file.type.startsWith("video/")) {
      alert("비디오 파일만 업로드 가능합니다.");
      setIsUploading(false);
      setIsConverting(false);
      return;
    }
    console.log("비디오 파일 업로드됨:", file.name, "타입:", file.type);

    const fd = new FormData();
    fd.append("video", file);
    try {
      const res = await fetch("http://localhost:5000/process-video", {
        method: "POST",
        body: fd
      }).then(res => res.json());
      if (res.status === "error") {
        alert(`비디오 처리 실패: ${res.msg}`);
        setIsUploading(false);
        setIsConverting(false);
        return;
      }
      setVideoUrl(res.converted_url);
      setCurrentTime(0);
      setIntervals([]);
      setMarkStart(null);
      setPage(0);
    } catch (error) {
      alert(`비디오 처리 실패: ${error.message}`);
      setIsUploading(false);
      setIsConverting(false);
    }
    setIsUploading(false);
    setIsConverting(false);
  }

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      console.log("비디오 src 설정:", videoUrl);
      videoRef.current.src = videoUrl;
      videoRef.current.load();
      videoRef.current.onloadedmetadata = () => {
        console.log("비디오 메타데이터 로드됨, 길이:", videoRef.current.duration);
        setVideoDuration(videoRef.current.duration);
      };
      videoRef.current.onerror = (e) => {
        console.error("비디오 오류:", e);
        alert("비디오 재생 실패: 변환된 MP4 파일을 확인해주세요.");
      };
    }
    return () => {
      if (videoRef.current) {
        console.log("videoRef 정리 중");
        videoRef.current.onloadedmetadata = null;
        videoRef.current.onerror = null;
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      e.preventDefault();
      if (isAddingInterval) return;
      if (e.code === "Space") {
        togglePlayPause();
      } else if (e.code === "KeyS") {
        markIntervalStart();
      } else if (e.code === "KeyE" && markStart !== null) {
        markIntervalEnd();
      } else if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"].includes(e.code)) {
        const behaviorIndex = parseInt(e.code.replace("Digit", "")) - 1;
        if (behaviorIndex < behaviors.length && markStart !== null && intervalEnd) {
          setIsAddingInterval(true);
          const selectedBehavior = behaviors[behaviorIndex];
          console.log(`행동 선택: ${selectedBehavior}`);
          setIntervalBehavior(selectedBehavior);
          addInterval(selectedBehavior);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markStart, intervalEnd, isAddingInterval]);

  useEffect(() => {
    if (isAddingInterval) {
      setIsAddingInterval(false);
    }
  }, [intervals]);

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
  }

  function handleSliderChange(event, newValue) {
    setCurrentTime(newValue);
    if (videoRef.current) {
      console.log("슬라이더 변경, 비디오 시간 설정:", newValue);
      videoRef.current.currentTime = newValue;
    }
  }

  function togglePlayPause() {
    if (!videoRef.current) {
      console.log("togglePlayPause: videoRef.current가 null입니다");
      return;
    }
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      console.log("비디오 일시정지");
    } else {
      videoRef.current.play().catch(error => {
        console.error("재생 오류:", error);
        alert("비디오 재생 실패: 변환된 MP4 파일을 확인해주세요.");
      });
      setIsPlaying(true);
      console.log("비디오 재생 중");
    }
  }

  function markIntervalStart() {
    setMarkStart(currentTime.toFixed(2));
    setIntervalStart(currentTime.toFixed(2));
    console.log("구간 시작 체크:", currentTime.toFixed(2));
  }

  function markIntervalEnd() {
    if (markStart === null) {
      alert("먼저 시작 시간을 체크해주세요.");
      return;
    }
    setIntervalEnd(currentTime.toFixed(2));
    console.log("구간 끝 체크:", currentTime.toFixed(2));
  }

  function addInterval(behavior) {
    const startTime = parseFloat(intervalStart);
    const endTime = parseFloat(intervalEnd);
    if (isNaN(startTime) || isNaN(endTime) || startTime < 0 || endTime > videoDuration || startTime >= endTime) {
      alert("유효한 시작/끝 시간을 입력해주세요 (0 이상, 비디오 길이 이하, 시작 < 끝).");
      setIsAddingInterval(false);
      return;
    }
    const start = Math.round(startTime * frameRate);
    const end = Math.round(endTime * frameRate);
    setIntervals(prev => [
      ...prev,
      { start, end, startTime, endTime, behavior, auto: false }
    ]);
    setIntervalStart("");
    setIntervalEnd("");
    setIntervalBehavior(behaviors[0]);
    setMarkStart(null);
    setPage(0);
    console.log("구간 추가됨:", { start, end, startTime, endTime, behavior });
  }

  function updateIntervalBehavior(idx, newBehavior) {
    setIntervals(prev =>
      prev.map((interval, i) =>
        i === idx ? { ...interval, behavior: newBehavior } : interval
      )
    );
    console.log("구간 행동 수정됨:", { idx, behavior: newBehavior });
  }

  function removeInterval(idx) {
    setIntervals(intervals.filter((_, i) => i !== idx));
    if (page * rowsPerPage >= intervals.length - 1) {
      setPage(Math.max(0, page - 1));
    }
  }

  function downloadCsvAll() {
    const zip = new JSZip();
    const intervalData = intervals.map(i => ({
      type: "interval",
      start_time: i.startTime,
      end_time: i.endTime,
      start_frame: i.start,
      end_frame: i.end,
      behavior: i.behavior
    }));
    const intervalCsv = Papa.unparse(intervalData);
    zip.file("interval_summary.csv", intervalCsv);
    zip.generateAsync({ type: "blob" }).then(blob => {
      saveAs(blob, "behavior_labels.zip");
    });
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: 2, bgcolor: 'background.default', color: 'text.primary' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>Behavior Labeling Tool</Typography>
          <IconButton onClick={toggleTheme} color="inherit" aria-label="테마 전환">
            {themeMode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Box>
        <Box sx={{ my: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" gutterBottom>비디오 선택</Typography>
            <input
              type="file"
              accept="video/*"
              onChange={onFileChange}
              disabled={isConverting}
              aria-label="비디오 파일 선택"
            />
            {isConverting && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">비디오 변환 중...</Typography>
              </Box>
            )}
          </Box>
          <TextField
            label="프레임 레이트 (FPS)"
            type="number"
            value={frameRate}
            onChange={(e) => setFrameRate(Math.max(0.1, parseFloat(e.target.value) || 1))}
            size="small"
            inputProps={{ min: 0.1, step: 0.1 }}
            aria-label="프레임 레이트"
          />
          <Button
            onClick={downloadCsvAll}
            variant="contained"
            color="primary"
            aria-label="CSV 저장"
          >
            CSV 저장
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="h6">비디오</Typography>
            {!videoUrl ? (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "800px",
                  height: "450px",
                  backgroundColor: themeMode === "dark" ? "#333" : "#e0e0e0",
                  border: "1px solid #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: themeMode === "dark" ? "#bbb" : "#666",
                  fontSize: "1.2rem",
                  borderRadius: "4px"
                }}
                aria-label="비디오 플레이스홀더"
              >
                비디오를 업로드해주세요
              </Box>
            ) : (
              <video
                ref={videoRef}
                width="100%"
                style={{ maxWidth: "800px", border: "1px solid #ccc", borderRadius: "4px" }}
                controls
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setIsPlaying(false);
                  console.log("비디오 종료");
                }}
              />
            )}
            {videoUrl && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? "일시정지" : "재생"}
                  >
                    {isPlaying ? "일시정지" : "재생"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={markIntervalStart}
                    aria-label="구간 시작 체크"
                  >
                    시작 체크 (S)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={markIntervalEnd}
                    aria-label="구간 끝 체크"
                  >
                    끝 체크 (E)
                  </Button>
                  <Typography>
                    현재 시간: {currentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s
                  </Typography>
                </Box>
                <Slider
                  value={currentTime}
                  min={0}
                  max={videoDuration}
                  step={1 / frameRate}
                  onChange={handleSliderChange}
                  aria-label="비디오 타임라인"
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 1, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>행동 구간 설정</Typography>
              <Typography variant="body2" gutterBottom>
                단축키: 1 - jumping, 2 - unsupported rearing, 3 - supported rearing, 4 - grooming, 5 - freezing, 6 - etc
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="시작 시간 (초)"
                  type="number"
                  value={intervalStart}
                  onChange={(e) => setIntervalStart(e.target.value)}
                  size="small"
                  inputProps={{ min: 0, step: 0.1 }}
                  aria-label="구간 시작 시간"
                />
                <TextField
                  label="끝 시간 (초)"
                  type="number"
                  value={intervalStart ? intervalEnd : ""}
                  onChange={(e) => setIntervalEnd(e.target.value)}
                  size="small"
                  inputProps={{ min: intervalStart || 0, step: 0.1 }}
                  aria-label="구간 끝 시간"
                  disabled={!intervalStart}
                />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>행동</InputLabel>
                  <Select
                    value={intervalBehavior}
                    label="행동"
                    onChange={(e) => setIntervalBehavior(e.target.value)}
                  >
                    {behaviors.map((b, i) => (
                      <MenuItem key={b} value={b}>{`${b} (${i + 1})`}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  onClick={() => addInterval(intervalBehavior)}
                  variant="contained"
                  aria-label="구간 추가"
                  disabled={!intervalStart || !intervalEnd}
                >
                  추가
                </Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>구간</TableCell>
                    <TableCell>행동</TableCell>
                    <TableCell>삭제</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {intervals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        아직 추가된 구간이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    intervals
                      .slice()
                      .sort((a, b) => b.startTime - a.startTime)
                      .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                      .map((interval, i) => (
                        <TableRow key={i}>
                          <TableCell>{`${interval.startTime}s - ${interval.endTime}s`}</TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                              <InputLabel>행동</InputLabel>
                              <Select
                                value={interval.behavior}
                                label="행동"
                                onChange={(e) => updateIntervalBehavior(intervals.indexOf(interval), e.target.value)}
                              >
                                {behaviors.map((b, j) => (
                                  <MenuItem key={b} value={b}>{`${b} (${j + 1})`}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => removeInterval(intervals.indexOf(interval))}
                              aria-label={`구간 ${i + 1} 삭제`}
                            >
                              삭제
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              {intervals.length > rowsPerPage && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outlined"
                    aria-label="이전 페이지"
                  >
                    이전 페이지
                  </Button>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * rowsPerPage >= intervals.length}
                    variant="outlined"
                    aria-label="다음 페이지"
                  >
                    다음 페이지
                  </Button>
                  <Typography>
                    페이지 {page + 1} / {Math.ceil(intervals.length / rowsPerPage)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
}

export default App;