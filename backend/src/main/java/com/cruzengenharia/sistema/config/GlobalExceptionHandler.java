package com.cruzengenharia.sistema.config;

// --- HANDLER GLOBAL DE EXCEÇÕES E VALIDAÇÕES ---

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // --- ERROS DE VALIDAÇÃO (@Valid) ---
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new HashMap<>();
        for (FieldError err : ex.getBindingResult().getFieldErrors()) {
            campos.put(err.getField(), err.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(Map.of(
            "erro", "Dados inválidos.",
            "campos", campos
        ));
    }

    // --- ERROS DE NEGÓCIO (RuntimeException) ---
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "erro", ex.getMessage()
        ));
    }

    // --- VIOLAÇÃO DE INTEGRIDADE REFERENCIAL ---
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleIntegrity(
            org.springframework.dao.DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
            "erro", "Operação não permitida: existem registros vinculados a este item."
        ));
    }
}
