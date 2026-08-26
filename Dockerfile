FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN chmod +x /app/vendor/libredwg/dwg2dxf
ENV HOST=0.0.0.0
ENV PORT=8765
ENV MAX_DWG_MB=100
EXPOSE 8765
CMD ["python","remote_dwg_service.py"]
