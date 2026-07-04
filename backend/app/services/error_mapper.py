"""Map yt-dlp error output to user-friendly Chinese messages."""
from typing import Sequence

ERROR_RULES: Sequence[tuple[str, str]] = [
    ("http error 403", "访问被拒绝，可能视频需要登录或已失效"),
    ("http error 404", "视频不存在，可能已被删除"),
    ("http error 429", "请求过于频繁，请稍后重试"),
    ("video unavailable", "视频不可用，可能已被删除或设为私密"),
    ("this video is private", "该视频为私密视频，无法下载"),
    ("sign in", "Cookies 已过期或无效，请重新上传"),
    ("confirm your age", "该视频有年龄限制，请使用已登录的 Cookies"),
    ("cookies", "Cookies 已过期或无效，请重新上传"),
    ("requested format is not available", "所选分辨率不可用，请尝试其他分辨率"),
    ("format is not available", "所选分辨率不可用，请尝试其他分辨率"),
    ("ffmpeg", "服务器未安装 ffmpeg，请联系管理员"),
    ("unsupported url", "不支持的链接，请检查 URL 是否正确"),
    ("member-only", "该视频为会员专属，无法下载"),
    ("login required", "需要登录才能下载，请上传有效的 Cookies"),
    ("rate limit", "触发平台限流，请稍后重试"),
    ("timeout", "下载超时，请检查网络或稍后重试"),
    ("connection", "网络连接失败，请检查网络"),
    ("extractor", "解析视频信息失败，平台可能已更新"),
]


def map_error(stderr: str, exit_code: int) -> str:
    """Scan *stderr* against ERROR_RULES and return the best Chinese message."""
    stderr_lower = stderr.lower()
    for pattern, message in ERROR_RULES:
        if pattern in stderr_lower:
            return message
    return "下载失败，请稍后重试"